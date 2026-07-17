package com.example.visionpark.fragments;

import android.app.Dialog;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.SeekBar;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.DialogFragment;

import com.example.visionpark.R;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;

public class FilterDialogFragment extends DialogFragment {
    
    public interface FilterListener {
        void onFiltersApplied(FilterCriteria criteria);
    }
    
    public static class FilterCriteria {
        public int maxPrice = 200; // Default max price - increased to be more inclusive
        public double maxDistance = 20.0; // Default max distance in km - increased to be more inclusive
        public boolean availableOnly = false;
        public boolean carSlotsOnly = false;
        public boolean twoWheelerSlotsOnly = false;
        
        public FilterCriteria() {}
        
        public FilterCriteria(int maxPrice, double maxDistance, boolean availableOnly, 
                            boolean carSlotsOnly, boolean twoWheelerSlotsOnly) {
            this.maxPrice = maxPrice;
            this.maxDistance = maxDistance;
            this.availableOnly = availableOnly;
            this.carSlotsOnly = carSlotsOnly;
            this.twoWheelerSlotsOnly = twoWheelerSlotsOnly;
        }
    }
    
    private FilterListener filterListener;
    private FilterCriteria currentCriteria;
    
    // UI Components
    private SeekBar seekBarPrice;
    private SeekBar seekBarDistance;
    private TextView tvPriceValue;
    private TextView tvDistanceValue;
    private CheckBox cbAvailableOnly;
    private CheckBox cbCarSlots;
    private CheckBox cbTwoWheelerSlots;
    private Button btnApply;
    private Button btnReset;
    
    public static FilterDialogFragment newInstance(FilterCriteria criteria) {
        FilterDialogFragment fragment = new FilterDialogFragment();
        fragment.currentCriteria = criteria != null ? criteria : new FilterCriteria();
        return fragment;
    }
    
    public void setFilterListener(FilterListener listener) {
        this.filterListener = listener;
    }
    
    @NonNull
    @Override
    public Dialog onCreateDialog(@Nullable Bundle savedInstanceState) {
        View view = LayoutInflater.from(getContext()).inflate(R.layout.dialog_filter, null);
        initializeViews(view);
        setupSeekBars();
        loadCurrentFilters();
        setupClickListeners();
        
        MaterialAlertDialogBuilder builder = new MaterialAlertDialogBuilder(requireContext())
                .setTitle("Filter Parking Lots")
                .setView(view);
        
        Dialog dialog = builder.create();
        
        // Ensure dialog can be scrolled if content is too tall
        if (dialog.getWindow() != null) {
            dialog.getWindow().setLayout(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            );
        }
        
        return dialog;
    }
    
    private void initializeViews(View view) {
        seekBarPrice = view.findViewById(R.id.seekBarPrice);
        seekBarDistance = view.findViewById(R.id.seekBarDistance);
        tvPriceValue = view.findViewById(R.id.tvPriceValue);
        tvDistanceValue = view.findViewById(R.id.tvDistanceValue);
        cbAvailableOnly = view.findViewById(R.id.cbAvailableOnly);
        cbCarSlots = view.findViewById(R.id.cbCarSlots);
        cbTwoWheelerSlots = view.findViewById(R.id.cbTwoWheelerSlots);
        btnApply = view.findViewById(R.id.btnApply);
        btnReset = view.findViewById(R.id.btnReset);
    }
    
    private void setupSeekBars() {
        // Price SeekBar (0-200 rupees)
        seekBarPrice.setMax(200);
        seekBarPrice.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            @Override
            public void onProgressChanged(SeekBar seekBar, int progress, boolean fromUser) {
                tvPriceValue.setText("₹" + progress + "/hr");
            }
            
            @Override
            public void onStartTrackingTouch(SeekBar seekBar) {}
            
            @Override
            public void onStopTrackingTouch(SeekBar seekBar) {}
        });
        
        // Distance SeekBar (0-20 km)
        seekBarDistance.setMax(20);
        seekBarDistance.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            @Override
            public void onProgressChanged(SeekBar seekBar, int progress, boolean fromUser) {
                double distance = progress == 0 ? 0.5 : progress;
                tvDistanceValue.setText(String.format("%.1f km", distance));
            }
            
            @Override
            public void onStartTrackingTouch(SeekBar seekBar) {}
            
            @Override
            public void onStopTrackingTouch(SeekBar seekBar) {}
        });
    }
    
    private void loadCurrentFilters() {
        if (currentCriteria == null) {
            currentCriteria = new FilterCriteria();
        }
        
        seekBarPrice.setProgress(currentCriteria.maxPrice);
        seekBarDistance.setProgress((int) currentCriteria.maxDistance);
        cbAvailableOnly.setChecked(currentCriteria.availableOnly);
        cbCarSlots.setChecked(currentCriteria.carSlotsOnly);
        cbTwoWheelerSlots.setChecked(currentCriteria.twoWheelerSlotsOnly);
        
        // Update text views
        tvPriceValue.setText("₹" + currentCriteria.maxPrice + "/hr");
        tvDistanceValue.setText(String.format("%.1f km", currentCriteria.maxDistance));
    }
    
    private void setupClickListeners() {
        btnApply.setOnClickListener(v -> {
            applyFilters();
            dismiss();
        });
        
        btnReset.setOnClickListener(v -> {
            resetFilters();
        });
    }
    
    private void applyFilters() {
        FilterCriteria criteria = new FilterCriteria();
        criteria.maxPrice = seekBarPrice.getProgress();
        criteria.maxDistance = seekBarDistance.getProgress() == 0 ? 0.5 : seekBarDistance.getProgress();
        criteria.availableOnly = cbAvailableOnly.isChecked();
        criteria.carSlotsOnly = cbCarSlots.isChecked();
        criteria.twoWheelerSlotsOnly = cbTwoWheelerSlots.isChecked();
        
        if (filterListener != null) {
            filterListener.onFiltersApplied(criteria);
        }
    }
    
    private void resetFilters() {
        FilterCriteria defaultCriteria = new FilterCriteria();
        seekBarPrice.setProgress(defaultCriteria.maxPrice);
        seekBarDistance.setProgress((int) defaultCriteria.maxDistance);
        cbAvailableOnly.setChecked(defaultCriteria.availableOnly);
        cbCarSlots.setChecked(defaultCriteria.carSlotsOnly);
        cbTwoWheelerSlots.setChecked(defaultCriteria.twoWheelerSlotsOnly);
        
        // Update text views
        tvPriceValue.setText("₹" + defaultCriteria.maxPrice + "/hr");
        tvDistanceValue.setText(String.format("%.1f km", defaultCriteria.maxDistance));
    }
}