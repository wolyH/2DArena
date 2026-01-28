package com.wolyh.game.backend.model;

import java.util.UUID;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Room {

    @EqualsAndHashCode.Include
    private String id;

    private String creatorName;
    private String guestName;
    private RoomStatus status;

    public Room(String creatorName) {
        this.id = UUID.randomUUID().toString();
        this.creatorName = creatorName;
        this.status = RoomStatus.WAITING;
    }

}
