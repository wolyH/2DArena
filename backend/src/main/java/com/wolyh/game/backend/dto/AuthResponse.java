package com.wolyh.game.backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuthResponse {

    String token;
    boolean isAuthenticated;
    String message;
    
}
