FROM debian:latest
WORKDIR /usr/local/dailyShuffle

COPY ./dist/dailyShuffle_linux-x64 ./main
RUN chmod +x main
EXPOSE 80

RUN useradd dailyShuffle
USER dailyShuffle

ENV DAILYSHUFFLE_PORT=80
ENV DAILYSHUFFLE_HOSTNAME=0.0.0.0
ENV DAILYSHUFFLE_DB_PATH=/appdata/dailyShuffle.sqlite
CMD [ "./main" ]
