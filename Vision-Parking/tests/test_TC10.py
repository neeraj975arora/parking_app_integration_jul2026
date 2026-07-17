import pytest
from appium.webdriver.common.appiumby import AppiumBy
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from tests.common import wait_for_element

def test_login_with_empty_credentials(driver):
    """
    Tests that validation errors appear when trying to log in with empty fields.
    Steps:
    1. Navigate to the login screen.
    2. Click the login button without entering any text.
    3. Verify that a toast message with the validation error is displayed.
    """
    # 1. Navigate to the Login Screen
    wait_for_element(driver, (AppiumBy.ID, 'btnGetStarted')).click()

    # 2. Click the login button while fields are empty
    wait_for_element(driver, (AppiumBy.ID, 'btnLogin')).click()

    # 3. Verify that a toast message with the error is displayed.
    # We check for a toast message, which is the standard way to show transient errors.
    try:
        # This XPath is the standard way to find a toast message in Appium
        toast_locator = (AppiumBy.XPATH, "//android.widget.Toast")

        # Wait up to 10 seconds for the toast to appear
        toast_element = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located(toast_locator)
        )

        toast_text = toast_element.text.lower()

        # Assert that the toast message contains a relevant keyword.
        # This is more flexible than checking for the exact text.
        assert "email" in toast_text or "password" in toast_text

    except Exception:
        pytest.fail("Validation toast message did not appear after clicking login with empty fields.")
