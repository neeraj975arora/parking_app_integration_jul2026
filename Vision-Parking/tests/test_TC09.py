from appium.webdriver.common.appiumby import AppiumBy
from tests.common import wait_for_element, assert_element_is_visible
from tests.auth_helpers import login, generate_unique_email
from tests.constants import REGISTER_PASSWORD

def test_login_with_unregistered_email(driver):
    """
    Tests that a user cannot log in with an email address that is not registered.
    Steps:
    1. Navigate to the login screen.
    2. Generate a unique email that is guaranteed not to exist in the system.
    3. Attempt to log in with this unregistered email.
    4. Verify that an error occurs and the user remains on the login screen.
    """
    # 1. Navigate to the Login Screen from the splash screen
    wait_for_element(driver, (AppiumBy.ID, 'btnGetStarted')).click()
    # The app defaults to the login screen after this action.

    # 2. Generate credentials that are guaranteed not to be registered
    unregistered_email = generate_unique_email()
    # The password can be anything, as the email check happens first.
    dummy_password = REGISTER_PASSWORD

    # 3. Attempt to log in with the unregistered credentials
    login(driver, unregistered_email, dummy_password, expect_success=False)

    # 4. Verify that the user remains on the login screen.
    # We confirm this by checking for an element that only exists on the login screen.
    login_screen_indicator = (AppiumBy.ID, 'tvRegister')
    assert_element_is_visible(driver, login_screen_indicator)
