package com.example.advisor;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class SchedulingService {
    private static final String[][] ADVISORS = {
        {"Alex Morgan", "Everyday banking"},
        {"Jordan Lee", "Retirement planning"},
        {"Sam Rivera", "Home financing"},
        {"Taylor Brooks", "Investment planning"}
    };

    private final AppointmentRepository appointments;

    public SchedulingService(AppointmentRepository appointments) {
        this.appointments = appointments;
    }

    public Schedule schedule(String requestedDate) {
        String date = validateDate(requestedDate);
        Map<String, Appointment> booked = new HashMap<>();
        for (Appointment appointment : appointments.findByDate(date)) {
            booked.put(appointment.getAdvisorId() + ":" + appointment.getHour(), appointment);
        }
        List<Schedule.Advisor> advisors = new ArrayList<>();
        for (int index = 0; index < ADVISORS.length; index++) {
            int id = index + 1;
            List<Schedule.Slot> slots = new ArrayList<>();
            for (int hour = 10; hour < 22; hour++) {
                slots.add(new Schedule.Slot(hour, booked.get(id + ":" + hour)));
            }
            advisors.add(new Schedule.Advisor(id, ADVISORS[index][0], ADVISORS[index][1], slots));
        }
        return new Schedule(date, advisors);
    }

    public Appointment book(AppointmentRequest request) {
        String date = validateDate(request.getDate());
        String customerName = request.getCustomerName().trim();
        if (customerName.isEmpty()) {
            throw new IllegalArgumentException("Customer name must not be blank.");
        }
        return appointments.saveAndFlush(new Appointment(
            request.getAdvisorId(), date, request.getHour(), customerName));
    }

    private String validateDate(String value) {
        try {
            if (value == null || !value.matches("\\d{4}-\\d{2}-\\d{2}")) {
                throw new IllegalArgumentException("Use a valid date in YYYY-MM-DD format.");
            }
            return LocalDate.parse(value).toString();
        } catch (DateTimeParseException exception) {
            throw new IllegalArgumentException("Use a valid date in YYYY-MM-DD format.");
        }
    }
}
