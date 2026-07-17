package com.example.visionpark.activities;

import android.content.SharedPreferences;
import android.os.Bundle;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import com.example.visionpark.R;
import com.google.android.material.bottomnavigation.BottomNavigationView;
import android.view.MenuItem;
import android.widget.Toast;
import androidx.annotation.NonNull;
import android.content.Intent;

public class ProfileActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_profile);

        SharedPreferences prefs = getSharedPreferences("visionpark_prefs", MODE_PRIVATE);
        String username = prefs.getString("username", "User");
        String email = prefs.getString("user_email", "");
        int userId = prefs.getInt("user_id", 0);
        String address = prefs.getString("user_address", "");
        String phone = prefs.getString("user_phone_no", "");

        ((TextView) findViewById(R.id.tvProfileName)).setText(username);
        ((TextView) findViewById(R.id.tvProfileEmail)).setText(email);
        ((TextView) findViewById(R.id.tvProfileCustomerId)).setText("Customer ID: " + userId);
        ((TextView) findViewById(R.id.tvProfileAddress)).setText(address);
        ((TextView) findViewById(R.id.tvProfilePhone)).setText(phone);

        BottomNavigationView bottomNavigationView = findViewById(R.id.bottomNavigationView);
        bottomNavigationView.setSelectedItemId(R.id.nav_profile);
        bottomNavigationView.setOnNavigationItemSelectedListener(new BottomNavigationView.OnNavigationItemSelectedListener() {
            @Override
            public boolean onNavigationItemSelected(@NonNull MenuItem item) {
                int itemId = item.getItemId();
                if (itemId == R.id.nav_home) {
                    Intent intent = new Intent(ProfileActivity.this, HomeActivity.class);
                    intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
                    startActivity(intent);
                    finish();
                    return true;
                } else if (itemId == R.id.nav_sessions) {
                    Intent intent = new Intent(ProfileActivity.this, MySessionsActivity.class);
                    startActivity(intent);
                    return true;
                } else if (itemId == R.id.nav_bookings) {
                    Intent intent = new Intent(ProfileActivity.this, BookingsActivity.class);
                    startActivity(intent);
                    return true;
                } else if (itemId == R.id.nav_profile) {
                    // Already on Profile
                    return true;
                }
                return false;
            }
        });
    }
} 