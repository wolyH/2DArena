package com.wolyh.game.backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RoomResponse {

    private String roomId;
    private String creatorName;
    private String guestName;
    
}
