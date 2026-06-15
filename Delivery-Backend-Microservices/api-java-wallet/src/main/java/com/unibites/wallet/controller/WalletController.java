package com.unibites.wallet.controller;

import com.unibites.wallet.model.Wallet;
import com.unibites.wallet.repository.WalletRepository;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/wallet")
@CrossOrigin(origins = "*")
public class WalletController {

    @Autowired
    private WalletRepository walletRepository;

    private boolean isAuthorized(String token) {
        String secret = System.getenv("WALLET_SYSTEM_TOKEN");
        if (secret == null || secret.isEmpty()) {
            secret = "unibites-wallet-system-secret"; // Shared secret fallback
        }
        return secret.equals(token);
    }

    // --- HEALTH CHECK ---
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> getHealth() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "UP");
        response.put("service", "api-java-wallet");
        response.put("timestamp", LocalDateTime.now().toString());
        return ResponseEntity.ok(response);
    }

    // --- GET BALANCE (Auto-registers with $50.00 if it doesn't exist) ---
    @GetMapping("/balance/{email}")
    public ResponseEntity<?> getBalance(
            @PathVariable String email, 
            @RequestHeader(value = "X-Wallet-Token", required = false) String systemToken) {
        
        if (!isAuthorized(systemToken)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Acceso denegado. Token del sistema inválido o ausente.");
        }

        String cleanedEmail = email.trim().toLowerCase();
        Optional<Wallet> walletOpt = walletRepository.findById(cleanedEmail);
        
        Wallet wallet;
        if (walletOpt.isEmpty()) {
            // New student gets a default simulated balance of $50.00, platform starts at $0.00
            double initialBalance = cleanedEmail.equals("plataforma@uide.edu.ec") ? 0.00 : 50.00;
            wallet = new Wallet(cleanedEmail, initialBalance, LocalDateTime.now());
            walletRepository.save(wallet);
        } else {
            wallet = walletOpt.get();
        }

        Map<String, Object> response = new HashMap<>();
        response.put("email", wallet.getEmail());
        response.put("balance", wallet.getBalance());
        response.put("lastUpdated", wallet.getLastUpdated().toString());
        return ResponseEntity.ok(response);
    }

    // --- CREATE WALLET (Called by Python Core on Registration) ---
    @PostMapping("/create")
    public ResponseEntity<?> createWallet(
            @RequestBody TransactionRequest request,
            @RequestHeader(value = "X-Wallet-Token", required = false) String systemToken) {
        
        if (!isAuthorized(systemToken)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Acceso denegado. Token del sistema inválido o ausente.");
        }

        if (request.getEmail() == null) {
            return ResponseEntity.badRequest().body("Email inválido");
        }
        
        String email = request.getEmail().trim().toLowerCase();
        Optional<Wallet> walletOpt = walletRepository.findById(email);
        
        Wallet wallet;
        if (walletOpt.isEmpty()) {
            double initialBalance = email.equals("plataforma@uide.edu.ec") ? 0.00 : (request.getAmount() > 0 ? request.getAmount() : 50.00);
            wallet = new Wallet(email, initialBalance, LocalDateTime.now());
            walletRepository.save(wallet);
        } else {
            wallet = walletOpt.get();
        }

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Wallet creada/verificada exitosamente");
        response.put("email", wallet.getEmail());
        response.put("balance", wallet.getBalance());
        return ResponseEntity.ok(response);
    }

    // --- CREDIT TRANSACTION (e.g. Deliverer earnings) ---
    @PostMapping("/credit")
    public ResponseEntity<?> creditWallet(
            @RequestBody TransactionRequest request,
            @RequestHeader(value = "X-Wallet-Token", required = false) String systemToken) {
        
        if (!isAuthorized(systemToken)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Acceso denegado. Token del sistema inválido o ausente.");
        }

        if (request.getEmail() == null || request.getAmount() <= 0) {
            return ResponseEntity.badRequest().body("Email inválido o monto de crédito debe ser mayor a 0");
        }
        
        String email = request.getEmail().trim().toLowerCase();
        Optional<Wallet> walletOpt = walletRepository.findById(email);
        
        Wallet wallet = walletOpt.orElseGet(() -> new Wallet(email, 50.00, LocalDateTime.now()));
        wallet.setBalance(wallet.getBalance() + request.getAmount());
        wallet.setLastUpdated(LocalDateTime.now());
        walletRepository.save(wallet);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Wallet acreditada exitosamente");
        response.put("balance", wallet.getBalance());
        return ResponseEntity.ok(response);
    }

    // --- DEBIT TRANSACTION (e.g. Purchasing dishes) ---
    @PostMapping("/debit")
    public ResponseEntity<?> debitWallet(
            @RequestBody TransactionRequest request,
            @RequestHeader(value = "X-Wallet-Token", required = false) String systemToken) {
        
        if (!isAuthorized(systemToken)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Acceso denegado. Token del sistema inválido o ausente.");
        }

        if (request.getEmail() == null || request.getAmount() <= 0) {
            return ResponseEntity.badRequest().body("Email inválido o monto de débito debe ser mayor a 0");
        }

        String email = request.getEmail().trim().toLowerCase();
        Optional<Wallet> walletOpt = walletRepository.findById(email);
        
        Wallet wallet = walletOpt.orElseGet(() -> new Wallet(email, 50.00, LocalDateTime.now()));
        
        if (wallet.getBalance() < request.getAmount()) {
            Map<String, Object> errResponse = new HashMap<>();
            errResponse.put("success", false);
            errResponse.put("message", "Saldo insuficiente. Fondos disponibles: $" + wallet.getBalance());
            errResponse.put("balance", wallet.getBalance());
            return ResponseEntity.status(HttpStatus.PAYMENT_REQUIRED).body(errResponse);
        }

        wallet.setBalance(wallet.getBalance() - request.getAmount());
        wallet.setLastUpdated(LocalDateTime.now());
        walletRepository.save(wallet);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Débito procesado exitosamente");
        response.put("balance", wallet.getBalance());
        return ResponseEntity.ok(response);
    }
}

// Request Schema Class
@Data
class TransactionRequest {
    private String email;
    private double amount;
}
