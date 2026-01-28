package com.wolyh.game.backend.dto;

import com.wolyh.game.backend.model.UpdateType;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class UpdateMessage<T> {
    
    private UpdateType type;
    private T data;

}
