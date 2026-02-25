package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
@AllArgsConstructor
public class ChatbotResponse {
    private String sessionToken;
    private String response;
    private String action; // SHOW_FAQ, CHECK_ORDER, TRANSFER_TO_AGENT, END_SESSION
    private Object data; // Additional data (e.g., order details, FAQ items)

    public ChatbotResponse(String sessionToken, String response) {
        this.sessionToken = sessionToken;
        this.response = response;
        this.action = null;
        this.data = null;
    }
}

