FROM clux/muslrust

ARG warp10_endpoint
ARG warp10_token

ENV WARP10_ENDPOINT $warp10_endpoint
ENV WARP10_TOKEN $warp10_token

RUN apt-get update && apt-get upgrade -y
RUN apt-get install git openssl libssl-dev gettext -y
RUN rm -rf /var/lib/apt/lists/*

ENV BEAMIUM_PATH /opt/beamium
WORKDIR $BEAMIUM_PATH
RUN git clone https://github.com/runabove/beamium $BEAMIUM_PATH

ADD config.template .
RUN envsubst < config.template > config.yaml
RUN cat config.yaml

RUN cargo build

ENTRYPOINT cargo run -v
