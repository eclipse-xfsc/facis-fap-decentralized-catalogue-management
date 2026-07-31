@bdd @operations @smoke
Feature: Deployment health and observability
  The deployed DCM must expose reliable operational signals.

  Scenario: Liveness endpoint reports the running service
    When a client requests "/healthz"
    Then the response status is 200
    And the response content type is JSON
    And the response contains status "ok"
    And the response contains service "facis-dcm"
    And the response contains a valid timestamp and non-negative uptime

  @readiness
  Scenario: Readiness reports whether mandatory dependencies are usable
    When a client requests "/readyz"
    Then the response is 200 only when mandatory dependencies are usable
    And the response does not reveal credentials or internal configuration

  @manual-infra
  Scenario: A rolling deployment preserves service availability
    Given the current DCM release is healthy
    When DevOps performs a rolling deployment of the next release
    Then Kubernetes reports the rollout as successful
    And at least one ready replica serves traffic throughout the rollout
    And the liveness and readiness probes remain correctly configured

  @monitoring
  Scenario: Monitoring returns current module and audit information
    Given an administrator is signed in
    When the administrator opens Admin Tools Monitoring
    Then each DCM module has an explicit status and last-seen timestamp
    And the user, session and activity counters are displayed
    And recent audit events are displayed
    And refreshing the dashboard updates its generated timestamp

