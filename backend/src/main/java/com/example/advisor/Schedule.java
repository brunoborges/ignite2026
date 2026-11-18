package com.example.advisor;

import java.util.List;

public class Schedule {
    public final String date;
    public final int openingHour = 10;
    public final int closingHour = 22;
    public final List<Advisor> advisors;

    public Schedule(String date, List<Advisor> advisors) {
        this.date = date;
        this.advisors = advisors;
    }

    public static class Advisor {
        public final int id;
        public final String name;
        public final String specialty;
        public final List<Slot> slots;

        public Advisor(int id, String name, String specialty, List<Slot> slots) {
            this.id = id;
            this.name = name;
            this.specialty = specialty;
            this.slots = slots;
        }
    }

    public static class Slot {
        public final int hour;
        public final Appointment appointment;

        public Slot(int hour, Appointment appointment) {
            this.hour = hour;
            this.appointment = appointment;
        }
    }
}
