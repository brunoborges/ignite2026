package com.example.advisor;

import java.util.Arrays;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.junit4.SpringRunner;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.hasSize;
import static org.junit.Assert.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@RunWith(SpringRunner.class)
@SpringBootTest
@AutoConfigureMockMvc
public class AppointmentApiTest {
    @Autowired
    private MockMvc mvc;

    @Autowired
    private AppointmentRepository appointments;

    @Before
    public void clearAppointments() {
        appointments.deleteAll();
    }

    @Test
    public void listsFourAdvisorsAndTwelveHourlySlots() throws Exception {
        mvc.perform(get("/api/schedule").param("date", "2026-11-18"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.advisors", hasSize(4)))
            .andExpect(jsonPath("$.advisors[0].slots", hasSize(12)))
            .andExpect(jsonPath("$.advisors[0].slots[0].hour").value(10))
            .andExpect(jsonPath("$.advisors[3].id").value(4))
            .andExpect(jsonPath("$.advisors[3].slots[11].hour").value(21));
    }

    @Test
    public void booksCustomerAndIsolatesSchedulesByDate() throws Exception {
        mvc.perform(post("/api/appointments").contentType(MediaType.APPLICATION_JSON)
                .content(booking(1, "2026-11-18", 21, "  Morgan Smith  ")))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.customerName").value("Morgan Smith"));
        mvc.perform(get("/api/schedule").param("date", "2026-11-18"))
            .andExpect(jsonPath("$.advisors[0].slots[11].appointment.customerName").value("Morgan Smith"));
        mvc.perform(get("/api/schedule").param("date", "2026-11-19"))
            .andExpect(jsonPath("$.advisors[0].slots[11].appointment").isEmpty());
    }

    @Test
    public void rejectsDoubleBookingButAllowsOtherAdvisorsAndDates() throws Exception {
        String appointment = booking(1, "2026-11-18", 10, "Morgan");
        mvc.perform(post("/api/appointments").contentType(MediaType.APPLICATION_JSON).content(appointment))
            .andExpect(status().isCreated());
        mvc.perform(post("/api/appointments").contentType(MediaType.APPLICATION_JSON).content(appointment))
            .andExpect(status().isConflict());
        mvc.perform(post("/api/appointments").contentType(MediaType.APPLICATION_JSON)
                .content(booking(2, "2026-11-18", 10, "Jordan")))
            .andExpect(status().isCreated());
        mvc.perform(post("/api/appointments").contentType(MediaType.APPLICATION_JSON)
                .content(booking(1, "2026-11-19", 10, "Morgan")))
            .andExpect(status().isCreated());
    }

    @Test
    public void rejectsInvalidAppointmentFields() throws Exception {
        String[] invalid = {
            booking(0, "2026-11-18", 10, "Morgan"),
            booking(5, "2026-11-18", 10, "Morgan"),
            booking(9, "2026-11-18", 10, "Morgan"),
            booking(1, "2026-11-18", 9, "Morgan"),
            booking(1, "2026-11-18", 22, "Morgan"),
            booking(1, "2026-02-30", 10, "Morgan"),
            booking(1, "2026-11-18", 10, "   "),
            "{\"advisorId\":1,\"date\":\"2026-11-18\",\"hour\":10}",
            "{}"
        };
        for (String request : invalid) {
            mvc.perform(post("/api/appointments").contentType(MediaType.APPLICATION_JSON).content(request))
                .andExpect(status().isBadRequest());
        }
        assertEquals(0, appointments.count());
    }

    @Test
    public void rejectsMalformedAndImpossibleScheduleDates() throws Exception {
        for (String date : Arrays.asList("2026-2-01", "2026-02-30", "", "not-a-date")) {
            mvc.perform(get("/api/schedule").param("date", date))
                .andExpect(status().isBadRequest());
        }
    }

    @Test
    public void concurrentRequestsCannotBookSameSlot() throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(2);
        Callable<Integer> book = () -> mvc.perform(post("/api/appointments")
            .contentType(MediaType.APPLICATION_JSON)
            .content(booking(1, "2026-11-18", 10, "Morgan")))
            .andReturn().getResponse().getStatus();
        try {
            List<Future<Integer>> results = executor.invokeAll(Arrays.asList(book, book));
            int first = results.get(0).get();
            int second = results.get(1).get();
            assertEquals(610, first + second);
            assertEquals(1, appointments.count());
        } finally {
            executor.shutdownNow();
        }
    }

    private String booking(int advisorId, String date, int hour, String name) {
        return String.format("{\"advisorId\":%d,\"date\":\"%s\",\"hour\":%d,\"customerName\":\"%s\"}",
            advisorId, date, hour, name);
    }
}
