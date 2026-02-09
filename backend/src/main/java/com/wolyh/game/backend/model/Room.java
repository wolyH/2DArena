package com.wolyh.game.backend.model;

import java.util.UUID;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class Room {

    public final String id;
    private String creatorName;
    private String guestName;
    private Status status;

    public Room(String creatorName) {
        this.id = UUID.randomUUID().toString();
        this.creatorName = creatorName;
        this.status = Status.WAITING;
    }

    public static enum Status {
        WAITING,
        FULL,
        PLAYING,
        FINISHED
    }

}
