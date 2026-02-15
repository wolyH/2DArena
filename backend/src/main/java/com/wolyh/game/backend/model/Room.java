package com.wolyh.game.backend.model;

import java.util.UUID;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class Room {
    public final String id;
    private String creator;
    private String guest;
    private Status status;

    public Room(String creator) {
        this.id = UUID.randomUUID().toString();
        this.creator = creator;
        this.status = Status.WAITING;
    }

    public static enum Status {
        WAITING,
        FULL,
        PLAYING,
        FINISHED
    }
}
