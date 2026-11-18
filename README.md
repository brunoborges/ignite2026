# Financial advisor appointment scheduler

A fictional Northstar Bank demo: four financial advisors, daily one-hour appointments from 10:00 AM to 10:00 PM, and customer-name bookings. Choose a date, select an available meeting, and enter a customer name. Booked slots display the customer; the database prevents overlapping bookings for the same advisor, date, and hour, including simultaneous requests.

## Stack

- `backend/`: Java 8, Spring Boot **1.5.10.RELEASE**, Spring MVC REST API, Spring Data JPA / Hibernate, in-memory H2, and Log4j **2.14.1**.
- `frontend/`: separate Node.js server with vanilla HTML/CSS/JavaScript. No npm dependencies or frontend build step. API requests are proxied to the backend.

This intentionally legacy backend is a modernization demo, not a production banking application. It has no authentication; use fictional customer names. In-memory appointments disappear when the backend stops.

## Security patching demo

The backend deliberately uses outdated, vulnerable dependencies:

- Spring Boot `1.5.10.RELEASE` supplies an older Spring Framework and other legacy transitive dependencies.
- Log4j `2.14.1` is affected by [CVE-2021-44228 (Log4Shell)](https://logging.apache.org/log4j/2.x/security.html). The `log4j2.version` property in `backend/pom.xml` pins this version for the patching exercise.

Log4j 2 replaces the default Logback backend through `spring-boot-starter-log4j2`; it is used by application/framework logging, not merely added as an unused dependency. Both application starters exclude the default logging starter to avoid competing logging implementations.

Use this intentionally vulnerable baseline only as a local demo, not a deployed banking service. The exercise is dependency detection and patching, not exploit execution. No exploit endpoints or payloads are included.

Inspect the resolved logging dependencies before and after changing versions:

```sh
cd backend
mvn dependency:tree '-Dincludes=org.apache.logging.log4j:*,ch.qos.logback:*'
```

For remediation, upgrade to a maintained Spring Boot release and supported Java version, and use a currently supported patched Log4j release. Log4j `2.17.1` fixes the original late-2021 Log4j 2 vulnerabilities on Java 8, but is a historical patch milestone, not a recommendation to stop updating.

## Run

Requires Java 8, Maven, and Node.js 22+.

Terminal 1 (macOS):

```sh
export JAVA_HOME=$(/usr/libexec/java_home -F -v 1.8)
export PATH="$JAVA_HOME/bin:$PATH"
cd backend
mvn spring-boot:run
```

On other platforms, set `JAVA_HOME` to a Java 8 JDK and add its `bin` directory to `PATH`.

Terminal 2:

```sh
cd frontend
npm start
```

Open **http://localhost:3000**. The REST API listens on **http://localhost:8080**.

Backend configuration is in `backend/src/main/resources/application.properties`. Set `PORT` to change the backend port. The frontend accepts `PORT` (default `3000`) and `BACKEND_URL` (default `http://127.0.0.1:8080`), for example:

```sh
PORT=3001 BACKEND_URL=http://127.0.0.1:8081 npm start
```

## API

### Daily schedule

```sh
curl 'http://localhost:8080/api/schedule?date=2026-11-18'
```

Returns `date`, `openingHour`, `closingHour`, and four `advisors`. Each advisor includes `id`, `name`, `specialty`, and twelve `slots` with an integer `hour` and either `appointment: null` or a booked appointment. If omitted, `date` defaults to the server's current date.

### Book a meeting

```sh
curl -i http://localhost:8080/api/appointments \
  -H 'Content-Type: application/json' \
  -d '{"advisorId":1,"date":"2026-11-18","hour":10,"customerName":"Morgan Smith"}'
```

Returns **201** and the appointment. An occupied slot returns **409**; invalid input returns **400**, both with a JSON `message`. Advisor IDs are `1`-`4`, start hours are `10`-`21`, and names are required (maximum 100 characters). Dates must be valid `YYYY-MM-DD` dates. Appointments use local branch date and hour, without timezone conversion. Historical dates are allowed for demonstration.

## Tests

With Java 8 selected:

```sh
cd backend
mvn test
```

```sh
cd frontend
npm test
```

To package the standalone backend:

```sh
cd backend
mvn package
java -jar target/advisor-scheduler-1.0.0-SNAPSHOT.jar
```
