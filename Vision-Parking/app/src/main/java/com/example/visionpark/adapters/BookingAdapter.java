package com.example.visionpark.adapters;

import android.content.Context;
import android.graphics.Color;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.example.visionpark.R;
import com.example.visionpark.models.ParkingBooking;
import com.google.android.material.button.MaterialButton;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class BookingAdapter extends RecyclerView.Adapter<BookingAdapter.BookingViewHolder> {

    public interface OnBookingActionListener {
        void onCancelBooking(ParkingBooking booking);
        void onCheckinBooking(ParkingBooking booking);
    }

    private final Context context;
    private List<ParkingBooking> bookings;
    private OnBookingActionListener listener;

    private static final SimpleDateFormat ISO_FMT =
            new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault());
    private static final SimpleDateFormat TIME_FMT =
            new SimpleDateFormat("hh:mm a", Locale.getDefault());
    private static final SimpleDateFormat DATE_FMT =
            new SimpleDateFormat("MMM dd, yyyy", Locale.getDefault());

    public BookingAdapter(Context context, List<ParkingBooking> bookings) {
        this.context = context;
        this.bookings = bookings;
    }

    public void setListener(OnBookingActionListener listener) {
        this.listener = listener;
    }

    public void updateBookings(List<ParkingBooking> newBookings) {
        this.bookings = newBookings;
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public BookingViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(context).inflate(R.layout.item_booking_card, parent, false);
        return new BookingViewHolder(v);
    }

    @Override
    public void onBindViewHolder(@NonNull BookingViewHolder h, int position) {
        h.bind(bookings.get(position));
    }

    @Override
    public int getItemCount() {
        return bookings == null ? 0 : bookings.size();
    }

    class BookingViewHolder extends RecyclerView.ViewHolder {
        TextView tvStatus, tvBookingId, tvLotName, tvLotAddress, tvVehicle;
        TextView tvStartTime, tvStartDate, tvEndTime, tvEndDate, tvDuration, tvAmount;
        LinearLayout layoutActions;
        MaterialButton btnCancel, btnCheckin;

        BookingViewHolder(@NonNull View v) {
            super(v);
            tvStatus      = v.findViewById(R.id.tvBookingStatus);
            tvBookingId   = v.findViewById(R.id.tvBookingId);
            tvLotName     = v.findViewById(R.id.tvParkingLotName);
            tvLotAddress  = v.findViewById(R.id.tvParkingLotAddress);
            tvVehicle     = v.findViewById(R.id.tvVehicleReg);
            tvStartTime   = v.findViewById(R.id.tvScheduledStart);
            tvStartDate   = v.findViewById(R.id.tvStartDate);
            tvEndTime     = v.findViewById(R.id.tvScheduledEnd);
            tvEndDate     = v.findViewById(R.id.tvEndDate);
            tvDuration    = v.findViewById(R.id.tvDuration);
            tvAmount      = v.findViewById(R.id.tvAmount);
            layoutActions = v.findViewById(R.id.layoutActions);
            btnCancel     = v.findViewById(R.id.btnCancelBooking);
            btnCheckin    = v.findViewById(R.id.btnCheckinBooking);
        }

        void bind(ParkingBooking b) {
            tvBookingId.setText("#" + b.getBookingId());
            tvLotName.setText(b.getParkingLotName() != null ? b.getParkingLotName() : "Unknown Lot");
            tvLotAddress.setText(b.getParkingLotAddress() != null ? b.getParkingLotAddress() : "");
            tvVehicle.setText(b.getVehicleRegNo() != null ? b.getVehicleRegNo() : "Vehicle");
            tvDuration.setText(b.getFormattedDuration());
            tvAmount.setText(String.format(Locale.getDefault(), "Rs.%.0f", b.getEstimatedAmount()));

            // Parse and format times
            setDateTime(b.getScheduledStart(), tvStartTime, tvStartDate);
            setDateTime(b.getScheduledEnd(), tvEndTime, tvEndDate);

            // Status badge
            String status = b.getBookingStatus();
            tvStatus.setText(status != null ? status.toUpperCase().replace("_", " ") : "UNKNOWN");
            switch (status != null ? status : "") {
                case "confirmed":
                    tvStatus.setBackgroundResource(R.drawable.bg_status_active);
                    layoutActions.setVisibility(View.VISIBLE);
                    break;
                case "checked_in":
                    tvStatus.setBackgroundColor(Color.parseColor("#FF9800"));
                    layoutActions.setVisibility(View.GONE);
                    break;
                case "completed":
                    tvStatus.setBackgroundResource(R.drawable.bg_status_completed);
                    layoutActions.setVisibility(View.GONE);
                    break;
                case "cancelled":
                    tvStatus.setBackgroundColor(Color.parseColor("#9E9E9E"));
                    layoutActions.setVisibility(View.GONE);
                    break;
                default:
                    tvStatus.setBackgroundResource(R.drawable.bg_status_active);
                    layoutActions.setVisibility(View.GONE);
            }

            btnCancel.setOnClickListener(v -> {
                if (listener != null) listener.onCancelBooking(b);
            });
            btnCheckin.setOnClickListener(v -> {
                if (listener != null) listener.onCheckinBooking(b);
            });
        }

        private void setDateTime(String isoStr, TextView timeView, TextView dateView) {
            if (isoStr == null) { timeView.setText("--:--"); dateView.setText(""); return; }
            try {
                Date d = ISO_FMT.parse(isoStr);
                timeView.setText(TIME_FMT.format(d));
                dateView.setText(DATE_FMT.format(d));
            } catch (ParseException e) {
                timeView.setText(isoStr.length() > 10 ? isoStr.substring(11, 16) : isoStr);
                dateView.setText(isoStr.length() >= 10 ? isoStr.substring(0, 10) : "");
            }
        }
    }
}
