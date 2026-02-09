package com.wolyh.game.backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.wolyh.game.backend.dto.AuthRequest;
import com.wolyh.game.backend.dto.AuthResponse;
import com.wolyh.game.backend.utils.JwtUtil;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody AuthRequest request) {
        String token = jwtUtil.generateToken(request.username());
        AuthResponse response = AuthResponse.builder()
            .token(token)
            .isAuthenticated(true)
            .build();
        return ResponseEntity.ok(response);
    }
    
}