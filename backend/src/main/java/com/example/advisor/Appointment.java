package com.example.advisor;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"advisor_id", "meeting_date", "meeting_hour"}))
public class Appointment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "advisor_id", nullable = false)
    private Integer advisorId;

    @Column(name = "meeting_date", nullable = false, length = 10)
    private String date;

    @Column(name = "meeting_hour", nullable = false)
    private Integer hour;

    @Column(nullable = false, length = 100)
    private String customerName;

    protected Appointment() {
    }

    public Appointment(Integer advisorId, String date, Integer hour, String customerName) {
        this.advisorId = advisorId;
        this.date = date;
        this.hour = hour;
        this.customerName = customerName;
    }

    public Long getId() {
        return id;
    }

    public Integer getAdvisorId() {
        return advisorId;
    }

    public String getDate() {
        return date;
    }

    public Integer getHour() {
        return hour;
    }

    public String getCustomerName() {
        return customerName;
    }
}
