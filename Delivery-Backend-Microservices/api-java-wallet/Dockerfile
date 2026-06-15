# --- Stage 1: Build the Maven Project ---
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app

# Copy the pom.xml and download dependencies (cache layer)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy the source code and build the package
COPY src ./src
RUN mvn clean package -DskipTests

# --- Stage 2: Runtime Container ---
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Copy the built JAR from the builder stage
COPY --from=build /app/target/wallet-1.0.0-SNAPSHOT.jar wallet-service.jar

# Expose port
EXPOSE 8002

# Environment parameters
ENV SERVER_PORT=8002

# Run Spring Boot application
ENTRYPOINT ["java", "-jar", "wallet-service.jar"]
