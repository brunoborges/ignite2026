# Financial advisor appointment scheduler

A fictional Northstar Bank demo: four financial advisors, daily one-hour appointments from 10:00 AM to 10:00 PM, and customer-name bookings. Choose a date, select an available meeting, and enter a customer name. Booked slots display the customer; the database prevents overlapping bookings for the same advisor, date, and hour, including simultaneous requests.

## Stack

- `backend/`: Java 21, Spring Boot **3.5.16**, Spring MVC REST API, Spring Data JPA / Hibernate, in-memory H2, and Log4j 2 managed by the Spring Boot dependency BOM.
- `frontend/`: separate Node.js server with vanilla HTML/CSS/JavaScript. No npm dependencies or frontend build step. API requests are proxied to the backend.

This backend is a modernization demo, not a production banking application. It has no authentication; use fictional customer names. In-memory appointments disappear when the backend stops.

## Repeatable demo branches

- `insecure-branch` preserves the original Java 8 / Spring Boot 1.5 / Log4j 2.14.1 baseline. Use it only as a local demo.
- `fixed-branch` preserves the Java 21 upgrade and security fixes committed to `main`.

Stop the backend and frontend before switching, and keep the working tree clean. To show the original version:

```sh
git switch insecure-branch
export JAVA_HOME=$(/usr/libexec/java_home -F -v 1.8)
cd backend
"$JAVA_HOME/bin/java" -version
PATH="$JAVA_HOME/bin:$PATH" mvn clean spring-boot:run
```

To show the fixed version, run from the repository root:

```sh
git switch fixed-branch
export JAVA_HOME=$(/usr/libexec/java_home -F -v 21)
cd backend
PATH="$JAVA_HOME/bin:$PATH" mvn clean spring-boot:run
```

These JDK selection commands are for macOS; on other platforms, select the corresponding JDK. Restart the frontend in a separate terminal with `cd frontend && npm start`. Clean builds prevent compiled files from the other branch being reused. Switching branches does not reset ignored assessment artifacts under `.github/modernize/`.

## Dependency management

The backend uses `spring-boot-starter-log4j2` instead of the default Logback starter. Spring Boot's dependency BOM selects the Log4j versions; the project no longer pins the historically vulnerable Log4j `2.14.1` release. Keep dependencies current and scan the resolved dependency tree for newly disclosed vulnerabilities.

Inspect the resolved logging dependencies:

```sh
cd backend
mvn dependency:tree '-Dincludes=org.apache.logging.log4j:*,ch.qos.logback:*'
```


## Run

Requires Java 21, Maven, and Node.js 22+.

Terminal 1 (macOS):

```sh
export JAVA_HOME=$(/usr/libexec/java_home -F -v 21)
export PATH="$JAVA_HOME/bin:$PATH"
cd backend
mvn spring-boot:run
```

On other platforms, set `JAVA_HOME` to a Java 21 JDK and add its `bin` directory to `PATH`.

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

Returns **201** and the appointment. An occupied slot returns **409**; invalid input returns **400**, both with a JSON `message`. Advisor IDs are `1`-`4`, start hours are `10`-`21`, and names are required (maximum 100 characters). Advisor IDs and hours must be integers; floating-point JSON numbers are rejected rather than truncated. Dates must be valid `YYYY-MM-DD` dates. Appointments use local branch date and hour, without timezone conversion. Historical dates are allowed for demonstration.

## Tests

With Java 21 selected:

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
