Feature: Playwright site

	Scenario: Check get started link
		Given I am on sauce login page
		When I login to the site
        And I sort the products by "price" "ascending"
        Then I should see all products sorted by price in ascending order
