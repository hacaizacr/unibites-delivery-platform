package com.unibites.wallet.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "billeteras")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Wallet {

    @Id
    private String email; // Estudiante Email como ID único
    
    private double balance; // Saldo disponible
    
    private LocalDateTime lastUpdated;
}
