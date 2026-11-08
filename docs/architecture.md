# Architecture

## Framework layers

```mermaid
flowchart TB
  subgraph Specs["tests/ (what to verify)"]
    S1[booking/*.spec.ts]
    S2[auth/ authz/]
    S3[contract/ integration/]
  end

  subgraph Support["src/ (how to talk to the system)"]
    F[fixtures<br/>DI, tokens, self-cleaning data]
    B[builders<br/>BookingBuilder]
    C[clients<br/>Auth, Booking, Dealer]
    A[ApiClient<br/>logging, masking, attachments]
    M[assertions<br/>toMatchSchema, toHaveStatus]
    SC[schemas/*.json]
    K[support/knownIssue]
  end

  PW[Playwright APIRequestContext]
  RB[(Restful-Booker<br/>public API)]
  GW[(Dealer gateway<br/>virtualised)]

  Specs --> F
  Specs --> B
  Specs --> M
  Specs --> K
  F --> C --> A --> PW
  M --> SC
  PW --> RB
  PW --> GW
```

Each layer has one job:

| Layer | Responsibility | Changes when |
| --- | --- | --- |
| Spec | States behaviour in business terms | Requirements change |
| Fixture | Wires dependencies, owns setup and teardown | Environment or auth model changes |
| Resource client | Knows paths, verbs and auth headers for one resource | The API surface changes |
| `ApiClient` | Sends requests, records evidence, masks secrets | Rarely |
| Schema | Describes what consumers rely on | The contract changes (a reviewed event) |

A URL change touches one client. An auth change touches one fixture. Specs
stay readable to people who did not write them.

## Request flow and evidence

```mermaid
sequenceDiagram
  participant T as Test
  participant BC as BookingClient
  participant AC as ApiClient
  participant API as API
  participant R as HTML report

  T->>BC: partialUpdate(id, changes, auth)
  BC->>AC: patch(/booking/id, headers)
  AC->>API: PATCH /booking/id
  API-->>AC: 403 Forbidden
  AC->>R: attach request + response (Cookie masked)
  AC-->>T: APIResponse
  T->>T: expect(response).toHaveStatus(403)
```

Every exchange is attached to the test result, so a CI failure can be
diagnosed from the report artifact alone. The same attachments feed the AI
failure-analysis bundle.

## Pipeline

```mermaid
flowchart LR
  PR[Pull request / push to main] --> G

  subgraph G["Job: gate (required check)"]
    direction TB
    G1[npm ci] --> G2[typecheck] --> G3[lint] --> G4["@unit @critical @contract"]
  end

  G -- pass --> R
  G -- fail --> X[Merge blocked]

  subgraph R["Job: regression"]
    direction TB
    R1["@regression<br/>known issues expected to fail"]
  end

  G --> A1[(gate-report artifact)]
  R --> A2[(regression-report artifact)]
  R -- pass --> OK[Mergeable]
```

## Virtualised dealer gateway

```mermaid
flowchart LR
  subgraph Clients
    N[dealer-north-crm<br/>leads:read, leads:write]
    S[dealer-south-dms<br/>leads:read]
    O[oem-analytics<br/>leads:read:aggregate]
  end

  subgraph GW[Dealer gateway mock]
    T[/oauth/token<br/>client credentials, HMAC-signed tokens/]
    L[/dealers/:id/leads<br/>scope + tenant check/]
    ST[/oem/lead-stats<br/>aggregate scope/]
    SH[/dealers/:id/vehicles/:vin/service-history/]
  end

  DMS[(DMS upstream<br/>X-Mock-Scenario:<br/>healthy, unavailable,<br/>timeout, malformed)]

  N & S & O --> T
  N & S & O --> L
  O --> ST
  N --> SH --> DMS
```

The mock is about 300 lines of dependency-free Node. It's small on purpose:
anyone on the team can read it in one sitting and extend it. In a real
programme it would be replaced by, or generated from, the provider's OpenAPI
contract (WireMock, Prism, or Pact stubs).
