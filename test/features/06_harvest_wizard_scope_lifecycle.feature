@bdd @harvest @wizard
Feature: Harvest scope, lifecycle and execution
  The Harvest Wizard must preserve the selected catalogues, scope and lifecycle policy through execution.

  Background:
    Given an authenticated user with Harvest access
    And at least one active public QA catalogue is registered

  @scope
  Scenario: Harvest all assets from one catalogue
    Given one active catalogue is selected
    When the user selects "All assets in the remote catalogue"
    And accepts update handling "version"
    And accepts deletion handling "remove"
    Then the overview shows the selected catalogue and scope
    And the overview shows both lifecycle policies

  @scope
  Scenario Outline: Configure a supported harvest scope
    Given one active catalogue is selected
    When the user selects harvest scope "<scope>"
    Then the overview displays harvest scope "<scope>"

    Examples:
      | scope                                                |
      | All assets of a given type                           |
      | All assets ever imported from that remote catalogue  |
      | Assets imported in the last harvest                  |
      | Assets matching a query                              |
      | Assets changed between...                            |
      | All assets in scope of last harvest                  |

  @lifecycle
  Scenario: Retain a missing remote asset as orphaned
    Given a previously imported remote asset no longer exists
    And deletion handling "retain" is selected
    When the catalogue is harvested again
    Then the local asset is retained
    And its provenance marks it as orphaned

  @lifecycle
  Scenario: Create a new version for a changed remote asset
    Given a previously imported remote asset has changed
    And update handling "version" is selected
    When the catalogue is harvested again
    Then a new local version is created
    And the previous version remains available

  @truthful-status @negative
  Scenario: A harvest failure is reflected consistently
    Given a selected catalogue returns an unusable response
    When the harvest is started
    Then the live harvest status is "failed"
    And the imported count is 0
    And the error count is greater than 0
    And the same failure appears in Harvesting Overview

