package com.wolyh.game.backend.config;

import java.util.ArrayList;

import org.springframework.messaging.Message;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import com.wolyh.game.backend.service.RoomService;
import com.wolyh.game.backend.utils.JwtUtil;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Autowired
    private JwtUtil jwtUtil;
    
    @Autowired
    private RoomService roomService;
    
    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws").setAllowedOrigins("http://127.0.0.1:5173");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = 
                    MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

                if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                    String authHeader = accessor.getFirstNativeHeader("Authorization");

                    if (authHeader != null && authHeader.startsWith("Bearer ")) {
                        String token = authHeader.substring(7);

                        if (jwtUtil.validateToken(token)) {
                            String username = jwtUtil.extractUsername(token);
                            
                            UsernamePasswordAuthenticationToken auth = 
                                new UsernamePasswordAuthenticationToken(username, null, new ArrayList<>());
                            
                            accessor.setUser(auth); 
                        } else {
                            throw new MessageDeliveryException("Invalid JWT");
                        }
                    } else {
                        throw new MessageDeliveryException("No JWT found");
                    }
                }

                if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
                    UsernamePasswordAuthenticationToken user = 
                        (UsernamePasswordAuthenticationToken) accessor.getUser();
                    
                    if(user == null) {
                        throw new MessageDeliveryException("User must connect before subscribing");
                    }

                    String username = user.getName();
                    String destination = accessor.getDestination();

                    if (destination != null && destination.startsWith("/topic/room/")) {
                        String[] parts = destination.split("/");
                        if(parts.length < 4) {
                             throw new MessageDeliveryException(
                                "URL /topic/room must contain a roomId"
                            );
                        }
                        String roomId = parts[3];
                        Boolean isPlayerInRoom = roomService.isPlayerInRoom(username, roomId);
                        if (isPlayerInRoom == null) {
                             throw new MessageDeliveryException(
                                "Room " + roomId + " does not exist"
                            );
                        }
                        if (!isPlayerInRoom) {
                            throw new MessageDeliveryException(
                                "You are not authorized to subscribe to the room: " + roomId
                            );
                        }
                    }
                    else if (destination != null && destination.startsWith("/user/queue/specific-player")) {
                        String roomId = accessor.getFirstNativeHeader("roomId");

                        if (roomId == null || roomId.isEmpty()) {
                            throw new MessageDeliveryException("roomId header required");
                        }
                        Boolean isPlayerInRoom = roomService.isPlayerInRoom(username, roomId);
    
                        if (isPlayerInRoom == null) {
                             throw new MessageDeliveryException(
                                "Room " + roomId + " does not exist"
                            );
                        }
                        if (!isPlayerInRoom) {
                            throw new MessageDeliveryException(
                                "You are not authorized to subscribe to the room: " + roomId
                            );
                        }
                    }
                }
                return message;
            }
        });
    }
    
}
