package com.example.visionpark.activities;

import android.os.Bundle;
import android.text.TextUtils;
import android.util.Log;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.AutoCompleteTextView;
import android.widget.Button;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import com.example.visionpark.R;
import com.example.visionpark.models.UserVehicle;
import com.example.visionpark.network.ApiCallback;
import com.example.visionpark.network.CreateVehicleRequest;
import com.example.visionpark.network.NetworkManager;
import com.google.android.material.appbar.MaterialToolbar;
import com.google.android.material.snackbar.Snackbar;
import com.google.android.material.textfield.TextInputEditText;
import com.google.android.material.textfield.TextInputLayout;

import java.util.Calendar;

/**
 * Activity for adding a new vehicle to the user's account
 * Provides form validation and integration with vehicle management APIs
 */
public class AddVehicleActivity extends AppCompatActivity {
    
    private static final String TAG = "AddVehicleActivity";
    
    // UI Components
    private MaterialToolbar toolbar;
    private TextInputLayout tilVehicleName, tilRegistrationNumber, tilVehicleType;
    private TextInputLayout tilMake, tilModel, tilYear, tilColor;
    private TextInputEditText etVehicleName, etRegistrationNumber;
    private TextInputEditText etMake, etModel, etYear, etColor;
    private AutoCompleteTextView actvVehicleType;
    private Button btnCancel, btnSaveVehicle;
    private ProgressBar progressBar;
    
    // Data and services
    private NetworkManager networkManager;
    private String[] vehicleTypes = {"Car", "Motorcycle", "Truck", "Van", "SUV"};
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_add_vehicle);
        
        // Initialize network manager
        networkManager = NetworkManager.getInstance(this);
        
        // Initialize UI components
        initializeViews();
        setupToolbar();
        setupVehicleTypeDropdown();
        setupClickListeners();
        
        // Check authentication
        if (!networkManager.isAuthenticated()) {
            showAuthenticationRequiredDialog();
        }
    }
    
    /**
     * Initialize all UI components
     */
    private void initializeViews() {
        toolbar = findViewById(R.id.toolbar);
        
        // Text input layouts
        tilVehicleName = findViewById(R.id.tilVehicleName);
        tilRegistrationNumber = findViewById(R.id.tilRegistrationNumber);
        tilVehicleType = findViewById(R.id.tilVehicleType);
        tilMake = findViewById(R.id.tilMake);
        tilModel = findViewById(R.id.tilModel);
        tilYear = findViewById(R.id.tilYear);
        tilColor = findViewById(R.id.tilColor);
        
        // Edit texts
        etVehicleName = findViewById(R.id.etVehicleName);
        etRegistrationNumber = findViewById(R.id.etRegistrationNumber);
        etMake = findViewById(R.id.etMake);
        etModel = findViewById(R.id.etModel);
        etYear = findViewById(R.id.etYear);
        etColor = findViewById(R.id.etColor);
        
        // Vehicle type dropdown
        actvVehicleType = findViewById(R.id.actvVehicleType);
        
        // Buttons
        btnCancel = findViewById(R.id.btnCancel);
        btnSaveVehicle = findViewById(R.id.btnSaveVehicle);
        
        // Progress bar
        progressBar = findViewById(R.id.progressBar);
    }
    
    /**
     * Setup toolbar with navigation
     */
    private void setupToolbar() {
        setSupportActionBar(toolbar);
        if (getSupportActionBar() != null) {
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
            getSupportActionBar().setDisplayShowHomeEnabled(true);
        }
        
        toolbar.setNavigationOnClickListener(v -> onBackPressed());
    }
    
    /**
     * Setup vehicle type dropdown with predefined options
     */
    private void setupVehicleTypeDropdown() {
        ArrayAdapter<String> adapter = new ArrayAdapter<>(
            this, 
            android.R.layout.simple_dropdown_item_1line, 
            vehicleTypes
        );
        actvVehicleType.setAdapter(adapter);
        
        // Set default selection
        actvVehicleType.setText(vehicleTypes[0], false);
        
        // Handle selection
        actvVehicleType.setOnItemClickListener((parent, view, position, id) -> {
            clearVehicleTypeError();
        });
    }
    
    /**
     * Setup click listeners for interactive elements
     */
    private void setupClickListeners() {
        btnCancel.setOnClickListener(v -> onBackPressed());
        btnSaveVehicle.setOnClickListener(v -> saveVehicle());
        
        // Clear errors when user starts typing
        etVehicleName.setOnFocusChangeListener((v, hasFocus) -> {
            if (hasFocus) clearVehicleNameError();
        });
        
        etRegistrationNumber.setOnFocusChangeListener((v, hasFocus) -> {
            if (hasFocus) clearRegistrationNumberError();
        });
    }
    
    /**
     * Validate form inputs and save vehicle
     */
    private void saveVehicle() {
        if (!validateForm()) {
            return;
        }
        
        // Create vehicle request
        CreateVehicleRequest request = createVehicleRequest();
        
        // Show loading and save vehicle
        showLoading(true);
        
        networkManager.createVehicle(request, new ApiCallback<UserVehicle>() {
            @Override
            public void onSuccess(UserVehicle vehicle) {
                Log.d(TAG, "Vehicle created successfully: " + (vehicle.getVehicleName() != null ? vehicle.getVehicleName() : vehicle.getRegistrationNumber()));
                runOnUiThread(() -> {
                    showLoading(false);
                    showSuccessDialog(vehicle);
                });
            }
            
            @Override
            public void onError(String error) {
                Log.e(TAG, "Failed to create vehicle: " + error);
                runOnUiThread(() -> {
                    showLoading(false);
                    showError(error);
                });
            }
        });
    }
    
    /**
     * Validate all form inputs
     * @return true if form is valid, false otherwise
     */
    private boolean validateForm() {
        boolean isValid = true;
        
        // Clear previous errors
        clearAllErrors();
        
        // Validate vehicle name
        String vehicleName = getTextFromEditText(etVehicleName);
        if (TextUtils.isEmpty(vehicleName)) {
            tilVehicleName.setError("Vehicle name is required");
            isValid = false;
        } else if (vehicleName.length() < 2) {
            tilVehicleName.setError("Vehicle name must be at least 2 characters");
            isValid = false;
        }
        
        // Validate registration number
        String registrationNumber = getTextFromEditText(etRegistrationNumber);
        if (TextUtils.isEmpty(registrationNumber)) {
            tilRegistrationNumber.setError("Registration number is required");
            isValid = false;
        } else if (registrationNumber.length() < 3) {
            tilRegistrationNumber.setError("Registration number must be at least 3 characters");
            isValid = false;
        } else if (!isValidRegistrationNumber(registrationNumber)) {
            tilRegistrationNumber.setError("Please enter a valid registration number");
            isValid = false;
        }
        
        // Validate vehicle type
        String vehicleType = actvVehicleType.getText().toString().trim();
        if (TextUtils.isEmpty(vehicleType)) {
            tilVehicleType.setError("Vehicle type is required");
            isValid = false;
        }
        
        // Validate year if provided
        String yearStr = getTextFromEditText(etYear);
        if (!TextUtils.isEmpty(yearStr)) {
            try {
                int year = Integer.parseInt(yearStr);
                int currentYear = Calendar.getInstance().get(Calendar.YEAR);
                if (year < 1900 || year > currentYear + 1) {
                    tilYear.setError("Please enter a valid year (1900-" + (currentYear + 1) + ")");
                    isValid = false;
                }
            } catch (NumberFormatException e) {
                tilYear.setError("Please enter a valid year");
                isValid = false;
            }
        }
        
        return isValid;
    }
    
    /**
     * Create vehicle request from form inputs
     * @return CreateVehicleRequest object
     */
    private CreateVehicleRequest createVehicleRequest() {
        String vehicleName = getTextFromEditText(etVehicleName);
        String registrationNumber = getTextFromEditText(etRegistrationNumber).toUpperCase();
        String vehicleType = actvVehicleType.getText().toString().trim().toLowerCase();
        String make = getTextFromEditText(etMake);
        String model = getTextFromEditText(etModel);
        String color = getTextFromEditText(etColor);
        
        int year = 0;
        String yearStr = getTextFromEditText(etYear);
        if (!TextUtils.isEmpty(yearStr)) {
            try {
                year = Integer.parseInt(yearStr);
            } catch (NumberFormatException e) {
                // Year will remain 0 if parsing fails
            }
        }
        
        return new CreateVehicleRequest(
            registrationNumber,
            vehicleName,
            make,
            model,
            year,
            vehicleType,
            color
        );
    }
    
    /**
     * Validate registration number format
     * @param registrationNumber The registration number to validate
     * @return true if valid format
     */
    private boolean isValidRegistrationNumber(String registrationNumber) {
        // Basic validation - contains letters and numbers, no special characters except hyphens
        return registrationNumber.matches("^[A-Za-z0-9\\-]+$");
    }
    
    /**
     * Get text from TextInputEditText, handling null cases
     * @param editText The EditText to get text from
     * @return Trimmed text or empty string
     */
    private String getTextFromEditText(TextInputEditText editText) {
        if (editText == null || editText.getText() == null) {
            return "";
        }
        return editText.getText().toString().trim();
    }
    
    /**
     * Clear all form validation errors
     */
    private void clearAllErrors() {
        tilVehicleName.setError(null);
        tilRegistrationNumber.setError(null);
        tilVehicleType.setError(null);
        tilMake.setError(null);
        tilModel.setError(null);
        tilYear.setError(null);
        tilColor.setError(null);
    }
    
    /**
     * Clear specific field errors
     */
    private void clearVehicleNameError() {
        tilVehicleName.setError(null);
    }
    
    private void clearRegistrationNumberError() {
        tilRegistrationNumber.setError(null);
    }
    
    private void clearVehicleTypeError() {
        tilVehicleType.setError(null);
    }
    
    /**
     * Show success dialog after vehicle creation
     * @param vehicle The created vehicle
     */
    private void showSuccessDialog(UserVehicle vehicle) {
        new AlertDialog.Builder(this)
            .setTitle("Vehicle Added Successfully")
            .setMessage("Your vehicle \"" + (vehicle.getVehicleName() != null ? vehicle.getVehicleName() : vehicle.getRegistrationNumber()) + "\" has been registered successfully.")
            .setPositiveButton("OK", (dialog, which) -> {
                setResult(RESULT_OK);
                finish();
            })
            .setCancelable(false)
            .show();
    }
    
    /**
     * Show authentication required dialog
     */
    private void showAuthenticationRequiredDialog() {
        new AlertDialog.Builder(this)
            .setTitle("Login Required")
            .setMessage("Please log in to add vehicles to your account.")
            .setPositiveButton("OK", (dialog, which) -> finish())
            .setCancelable(false)
            .show();
    }
    
    /**
     * Show/hide loading indicator
     * @param show Whether to show loading
     */
    private void showLoading(boolean show) {
        progressBar.setVisibility(show ? View.VISIBLE : View.GONE);
        
        // Disable form during loading
        btnSaveVehicle.setEnabled(!show);
        btnCancel.setEnabled(!show);
        etVehicleName.setEnabled(!show);
        etRegistrationNumber.setEnabled(!show);
        actvVehicleType.setEnabled(!show);
        etMake.setEnabled(!show);
        etModel.setEnabled(!show);
        etYear.setEnabled(!show);
        etColor.setEnabled(!show);
        
        // Update button appearance
        btnSaveVehicle.setAlpha(show ? 0.5f : 1.0f);
    }
    
    /**
     * Show error message to user
     * @param message The error message
     */
    private void showError(String message) {
        Log.e(TAG, "Error: " + message);
        
        View rootView = findViewById(android.R.id.content);
        if (rootView != null) {
            Snackbar.make(rootView, message, Snackbar.LENGTH_LONG)
                .setAction("Retry", v -> saveVehicle())
                .show();
        } else {
            Toast.makeText(this, message, Toast.LENGTH_LONG).show();
        }
    }
    
    @Override
    public void onBackPressed() {
        // Check if form has unsaved changes
        if (hasUnsavedChanges()) {
            showUnsavedChangesDialog();
        } else {
            super.onBackPressed();
        }
    }
    
    /**
     * Check if form has unsaved changes
     * @return true if there are unsaved changes
     */
    private boolean hasUnsavedChanges() {
        return !TextUtils.isEmpty(getTextFromEditText(etVehicleName)) ||
               !TextUtils.isEmpty(getTextFromEditText(etRegistrationNumber)) ||
               !TextUtils.isEmpty(getTextFromEditText(etMake)) ||
               !TextUtils.isEmpty(getTextFromEditText(etModel)) ||
               !TextUtils.isEmpty(getTextFromEditText(etYear)) ||
               !TextUtils.isEmpty(getTextFromEditText(etColor));
    }
    
    /**
     * Show dialog for unsaved changes
     */
    private void showUnsavedChangesDialog() {
        new AlertDialog.Builder(this)
            .setTitle("Unsaved Changes")
            .setMessage("You have unsaved changes. Are you sure you want to leave?")
            .setPositiveButton("Leave", (dialog, which) -> {
                super.onBackPressed();
            })
            .setNegativeButton("Stay", null)
            .show();
    }
}