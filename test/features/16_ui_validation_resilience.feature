@bdd @ui @resilience
Feature: UI validation, pagination and recovery
  The UI must report backend truth, preserve navigation behavior and recover from transient stale state.

  Background:
    Given an authenticated user

  @pagination
  Scenario: Paginate a large result set without duplicate visible rows
    Given a table contains more than one page
    When the user moves to the next page
    Then the page indicator changes
    And the displayed range changes
    And no loading placeholder is presented as a data row

  @refresh
  Scenario: Refresh after a transient empty catalogue state
    Given the Harvest Wizard temporarily shows no registered catalogues
    When the user refreshes the UI
    Then active registered catalogues are loaded
    And the wizard can be reopened

  @validation
  Scenario: Backend validation is shown with an actionable cause
    Given a form passes connection testing but fails persistence validation
    When the backend rejects the submission
    Then the UI displays the exact invalid field or missing dependency
    And does not show only "configuration is invalid"

  @error-handling
  Scenario: Remote content-type mismatch reports the response facts
    Given a DCAT endpoint returns RDF content with a non-RDF HTTP content type
    When the catalogue is harvested
    Then the run fails or uses safe content sniffing according to policy
    And diagnostics include the endpoint and received content type

  @consistency
  Scenario: Live status and history status agree
    Given a harvest finishes
    When the live harvest result and history row are displayed
    Then both show the same success or failure status
    And both show consistent imported and error counts

