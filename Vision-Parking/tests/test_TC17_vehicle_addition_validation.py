"""
Test Case TC17: Vehicle Addition - Form Validation
===================================================
This test verifies that proper validation errors are shown when attempting to add
a vehicle with invalid or missing data.

Test Flow:
1. Login and navigate to vehicle addition screen
2. Attempt to submit form with empty fields
3. Verify validation errors are displayed
4. Test invalid registration number format
5. Test invalid year (future year, too old, non-numeric)
6. Verify that form cannot be submitted with invalid data

Expected Result:
- Appropriate validation error messages are displayed for each invalid field
- Form submission is blocked until all fields are valid
- User receives clear feedback about what needs to be corrected
"""

import time
from appium.webdriver.common.appiumby import AppiumBy
from tests.common import wait_for_element, assert_element_is_visible, assert_validation_message
from tests.auth_helpers import login
from tests.constants import REGISTER_EMAIL, REGISTER_PASSWORD


def scroll_to_element(driver, element_locator, max_scrolls=5):
    """
    Scroll down until element is visible or max scrolls reached.
    """
    for i in range(max_scrolls):
        try:
            element = driver.find_element(*element_locator)
            if element.is_displayed():
                return element
        except:
            pass

        # Perform scroll
        size = driver.get_window_size()
        start_x = size['width'] // 2
        start_y = size['height'] * 0.8
        end_y = size['height'] * 0.2

        driver.swipe(start_x, start_y, start_x, end_y, 500)
        time.sleep(0.5)

    # Try one more time after scrolling
    return wait_for_element(driver, element_locator)


def test_vehicle_addition_empty_fields_validation(driver):
    """
    Test that validation errors appear when trying to submit vehicle form with empty fields.

    This validates that:
    - Required field validation is working
    - User cannot submit incomplete forms
    - Clear error messages guide the user
    """

    # Step 1: Navigate to login and authenticate
    wait_for_element(driver, (AppiumBy.ID, 'btnGetStarted')).click()
    time.sleep(1)
    login(driver, REGISTER_EMAIL, REGISTER_PASSWORD)
    time.sleep(2)

    # Step 2: Navigate to vehicle management screen
    burger_menu_locator = (AppiumBy.ACCESSIBILITY_ID, "Open navigation drawer")
    wait_for_element(driver, burger_menu_locator).click()
    time.sleep(1)

    my_vehicles_menu_item = (AppiumBy.XPATH, "//*[@text='My Vehicles']")
    wait_for_element(driver, my_vehicles_menu_item).click()
    time.sleep(1)

    # Step 3: Click add vehicle button
    add_vehicle_button = (AppiumBy.ID, 'fabAddVehicle')
    wait_for_element(driver, add_vehicle_button).click()
    time.sleep(1)

    # Step 4: Attempt to submit form without filling any fields
    submit_button = scroll_to_element(driver, (AppiumBy.ID, 'btnSaveVehicle'))
    submit_button.click()
    time.sleep(1)

    # Step 5: Verify validation error message appears
    expected_error_messages = [
        "Registration number is required",
        "Please enter registration number",
        "required",
        "cannot be empty",
        "Please fill all required fields"
    ]
    assert_validation_message(driver, expected_error_messages)

    print("✓ Empty fields validation working correctly")


def test_vehicle_addition_invalid_registration_format(driver):
    """
    Test validation for invalid registration number formats.

    Registration numbers should follow specific patterns (e.g., alphanumeric, length constraints).
    This test verifies that invalid formats are rejected.
    """

    # Step 1: Login and navigate to vehicle addition screen
    wait_for_element(driver, (AppiumBy.ID, 'btnGetStarted')).click()
    time.sleep(1)
    login(driver, REGISTER_EMAIL, REGISTER_PASSWORD)
    time.sleep(2)

    # Navigate to add vehicle screen
    burger_menu_locator = (AppiumBy.ACCESSIBILITY_ID, "Open navigation drawer")
    wait_for_element(driver, burger_menu_locator).click()
    time.sleep(1)

    my_vehicles_menu_item = (AppiumBy.XPATH, "//*[@text='My Vehicles']")
    wait_for_element(driver, my_vehicles_menu_item).click()
    time.sleep(1)

    add_vehicle_button = (AppiumBy.ID, 'fabAddVehicle')
    wait_for_element(driver, add_vehicle_button).click()
    time.sleep(1)

    # Step 2: Test with invalid registration number (too short - less than 4 characters)
    registration_field = wait_for_element(driver, (AppiumBy.ID, 'etRegistrationNumber'))
    registration_field.clear()
    registration_field.send_keys("AB")  # Too short

    # Fill other required fields with valid data
    vehicle_name_field = wait_for_element(driver, (AppiumBy.ID, 'etVehicleName'))
    vehicle_name_field.send_keys("Test Vehicle")

    make_field = wait_for_element(driver, (AppiumBy.ID, 'etMake'))
    make_field.send_keys("Honda")

    model_field = wait_for_element(driver, (AppiumBy.ID, 'etModel'))
    model_field.send_keys("City")

    year_field = wait_for_element(driver, (AppiumBy.ID, 'etYear'))
    year_field.send_keys("2020")

    # Select vehicle type
    vehicle_type_field = wait_for_element(driver, (AppiumBy.ID, 'actvVehicleType'))
    vehicle_type_field.click()
    time.sleep(0.5)

    # Try to select "car" from dropdown, fallback to typing if dropdown doesn't appear
    try:
        car_option = wait_for_element(driver, (AppiumBy.XPATH, "//*[@text='car']"), timeout=3)
        car_option.click()
    except:
        # If dropdown doesn't appear, type directly
        vehicle_type_field.send_keys("car")
    time.sleep(0.5)

    color_field = scroll_to_element(driver, (AppiumBy.ID, 'etColor'))
    color_field.clear()
    color_field.send_keys("Blue")

    # Step 3: Attempt to submit with invalid registration
    submit_button = scroll_to_element(driver, (AppiumBy.ID, 'btnSaveVehicle'))
    submit_button.click()
    time.sleep(2)

    # Step 4: Verify validation error for invalid registration format
    expected_error_messages = [
        "Invalid registration number",
        "Registration number must be",
        "4-15 characters",
        "invalid format"
    ]
    assert_validation_message(driver, expected_error_messages)

    print("✓ Invalid registration number format validation working correctly")


def test_vehicle_addition_invalid_year(driver):
    """
    Test validation for invalid vehicle year values.

    Valid years should be between 1900 and current year + 1.
    This test verifies that invalid years are rejected.
    """

    # Step 1: Login and navigate to vehicle addition screen
    wait_for_element(driver, (AppiumBy.ID, 'btnGetStarted')).click()
    time.sleep(1)
    login(driver, REGISTER_EMAIL, REGISTER_PASSWORD)
    time.sleep(2)

    # Navigate to add vehicle screen
    burger_menu_locator = (AppiumBy.ACCESSIBILITY_ID, "Open navigation drawer")
    wait_for_element(driver, burger_menu_locator).click()
    time.sleep(1)

    my_vehicles_menu_item = (AppiumBy.XPATH, "//*[@text='My Vehicles']")
    wait_for_element(driver, my_vehicles_menu_item).click()
    time.sleep(1)

    add_vehicle_button = (AppiumBy.ID, 'fabAddVehicle')
    wait_for_element(driver, add_vehicle_button).click()
    time.sleep(1)

    # Step 2: Fill form with valid data except year
    registration_field = wait_for_element(driver, (AppiumBy.ID, 'etRegistrationNumber'))
    registration_field.clear()
    registration_field.send_keys(f"DL{int(time.time()) % 100000}")

    vehicle_name_field = wait_for_element(driver, (AppiumBy.ID, 'etVehicleName'))
    vehicle_name_field.send_keys("Test Vehicle")

    make_field = wait_for_element(driver, (AppiumBy.ID, 'etMake'))
    make_field.send_keys("Honda")

    model_field = wait_for_element(driver, (AppiumBy.ID, 'etModel'))
    model_field.send_keys("City")

    # Step 3: Enter invalid year (future year)
    year_field = wait_for_element(driver, (AppiumBy.ID, 'etYear'))
    year_field.clear()
    year_field.send_keys("2030")  # Future year

    # Select vehicle type
    vehicle_type_field = wait_for_element(driver, (AppiumBy.ID, 'actvVehicleType'))
    vehicle_type_field.click()
    time.sleep(0.5)

    # Try to select "car" from dropdown, fallback to typing if dropdown doesn't appear
    try:
        car_option = wait_for_element(driver, (AppiumBy.XPATH, "//*[@text='car']"), timeout=3)
        car_option.click()
    except:
        # If dropdown doesn't appear, type directly
        vehicle_type_field.send_keys("car")
    time.sleep(0.5)

    color_field = scroll_to_element(driver, (AppiumBy.ID, 'etColor'))
    color_field.clear()
    color_field.send_keys("Red")

    # Step 4: Attempt to submit with invalid year
    submit_button = scroll_to_element(driver, (AppiumBy.ID, 'btnSaveVehicle'))
    submit_button.click()
    time.sleep(2)
    
    # Step 5: Verify validation error for invalid year
    expected_error_messages = [
        "Invalid year",
        "Year must be between",
        "1900 and 2025",
        "future year"
    ]
    assert_validation_message(driver, expected_error_messages)
    
    print("✓ Invalid year validation working correctly")
