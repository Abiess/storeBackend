package storebackend.dto;

import lombok.Getter;
import lombok.Setter;

/** Request-Body für PUT /api/maritime/port – z. B. {"port":"NADOR"}. */
@Getter
@Setter
public class MaritimePortSwitchRequest {
    private String port;
}
