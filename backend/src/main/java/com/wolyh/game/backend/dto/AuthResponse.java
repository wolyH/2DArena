package com.wolyh.game.backend.dto;

import lombok.Builder;

@Builder
public record AuthResponse(
    String token,
    boolean isAuthenticated
) {}
