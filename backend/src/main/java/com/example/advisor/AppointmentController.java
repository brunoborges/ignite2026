package com.example.advisor;

import java.time.LocalDate;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class AppointmentController {
    private final SchedulingService scheduling;

    public AppointmentController(SchedulingService scheduling) {
        this.scheduling = scheduling;
    }

    @GetMapping("/schedule")
    public Schedule schedule(@RequestParam(required = false) String date) {
        return scheduling.schedule(date == null ? LocalDate.now().toString() : date);
    }

    @PostMapping("/appointments")
    @ResponseStatus(HttpStatus.CREATED)
    public Appointment book(@Valid @RequestBody AppointmentRequest request) {
        return scheduling.book(request);
    }
}
