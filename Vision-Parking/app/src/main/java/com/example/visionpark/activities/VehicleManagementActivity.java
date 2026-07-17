package com.example.visionpark.activities;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.example.visionpark.R;
import com.example.visionpark.adapters.VehicleListAdapter;
import com.example.visionpark.models.UserVehicle;
import com.example.visionpark.network.VehicleApiService;
import com.google.android.material.floatingactionbutton.FloatingActionButton;
import java.util.ArrayList;
import java.util.List;

/**
 * Activity to manage user's vehicles (view, add, edit, delete)
 * Accessed from navigation drawer "My Vehicles"
 */
public class VehicleManagementActivity extends AppCompatActivity implements VehicleListAdapter.OnVehicleClickListener {
    private static final String TAG = "VehicleManagementActivity";
    private static final int REQUEST_ADD_VEHICLE = 1001;
    
    // UI Components
    private ImageView ivBack;
    private TextView tvTitle;
    private RecyclerView rvVehicles;
    private ProgressBar progressBar;
    private View llEmptyState;
    private FloatingActionButton fabAddVehicle;
    
    // Data
    private VehicleListAdapter vehicleAdapter;
    private List<UserVehicle> vehicles;
    private VehicleApiService vehicleApiService;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_vehicle_management);
        
        initializeViews();
        setupRecyclerView();
        setupClickListeners();
        
        // Initialize API service
        vehicleApiService = new VehicleApiService(this);
        
        // Load user vehicles
        loadUserVehicles();
    }
    
    private void initializeViews() {
        ivBack = findViewById(R.id.ivBack);
        tvTitle = findViewById(R.id.tvTitle);
        rvVehicles = findViewById(R.id.rvVehicles);
        progressBar = findViewById(R.id.progressBar);
        llEmptyState = findViewById(R.id.llEmptyState);
        fabAddVehicle = findViewById(R.id.fabAddVehicle);
        
        tvTitle.setText("My Vehicles");
    }
    
    private void setupRecyclerView() {
        vehicles = new ArrayList<>();
        vehicleAdapter = new VehicleListAdapter(vehicles, this);
        rvVehicles.setLayoutManager(new LinearLayoutManager(this));
        rvVehicles.setAdapter(vehicleAdapter);
    }
    
    private void setupClickListeners() {
        ivBack.setOnClickListener(v -> finish());
        
        fabAddVehicle.setOnClickListener(v -> {
            Intent intent = new Intent(this, AddVehicleActivity.class);
            startActivityForResult(intent, REQUEST_ADD_VEHICLE);
        });
    }
    
    private void loadUserVehicles() {
        showLoading(true);
        
        vehicleApiService.getUserVehicles(new VehicleApiService.VehicleListCallback() {
            @Override
            public void onSuccess(List<UserVehicle> userVehicles) {
                runOnUiThread(() -> {
                    showLoading(false);
                    vehicles.clear();
                    vehicles.addAll(userVehicles);
                    vehicleAdapter.notifyDataSetChanged();
                    
                    updateEmptyState();
                    
                    Log.d(TAG, "Loaded " + userVehicles.size() + " vehicles");
                });
            }
            
            @Override
            public void onError(String error) {
                runOnUiThread(() -> {
                    showLoading(false);
                    Log.e(TAG, "Failed to load vehicles: " + error);
                    Toast.makeText(VehicleManagementActivity.this, 
                        "Failed to load vehicles: " + error, Toast.LENGTH_LONG).show();
                    updateEmptyState();
                });
            }
        });
    }
    
    private void showLoading(boolean show) {
        progressBar.setVisibility(show ? View.VISIBLE : View.GONE);
        rvVehicles.setVisibility(show ? View.GONE : View.VISIBLE);
    }
    
    private void updateEmptyState() {
        if (vehicles.isEmpty()) {
            llEmptyState.setVisibility(View.VISIBLE);
            rvVehicles.setVisibility(View.GONE);
        } else {
            llEmptyState.setVisibility(View.GONE);
            rvVehicles.setVisibility(View.VISIBLE);
        }
    }
    
    @Override
    public void onVehicleClick(UserVehicle vehicle) {
        Log.d(TAG, "Vehicle clicked: " + vehicle.getRegistrationNumber());
        // In management mode, clicking a vehicle could show details or edit options
        Toast.makeText(this, "Vehicle: " + vehicle.getRegistrationNumber(), Toast.LENGTH_SHORT).show();
    }
    
    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        
        if (requestCode == REQUEST_ADD_VEHICLE && resultCode == RESULT_OK) {
            // Reload vehicles after adding a new one
            loadUserVehicles();
        }
    }
}
