@bdd @security @authentication
Feature: Authentication and functional-area authorization
  The DCM must authenticate users and enforce functional-area permissions on the server.

  Background:
    Given the DCM test deployment is available

  @smoke
  Scenario: An administrator signs in and signs out
    Given an active administrator account
    When the administrator signs in with valid credentials
    Then the Local Catalogue is displayed
    When the administrator signs out
    Then the sign-in form is displayed

  @negative
  Scenario: Invalid credentials are rejected
    When a user signs in with an invalid password
    Then authentication is rejected
    And no protected DCM page is displayed

  @rbac
  Scenario: A restricted user cannot use an unassigned functional area
    Given an active user without Schema Registry access
    When the user attempts to open or invoke Schema Registry functionality
    Then the operation is rejected with "permission_denied"
    And the required permission is included in the response
    And the denial is written to the audit log

  @rbac @isolated
  Scenario: An administrator grants additional functional-area access
    Given an active user without Harvest access
    When an administrator grants Harvest access to that user
    And the user signs in again
    Then Harvest functionality is available
    And the user can initiate an authorized harvest

