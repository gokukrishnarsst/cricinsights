# Lambda container: Node handler + official Flyway CLI
FROM flyway/flyway:11 AS flyway

FROM public.ecr.aws/lambda/nodejs:22

COPY --from=flyway /flyway /opt/flyway
COPY --from=flyway /opt/java/openjdk /opt/java/openjdk

ENV FLYWAY_BIN=/opt/flyway/flyway \
    JAVA_HOME=/opt/java/openjdk \
    PATH=/opt/java/openjdk/bin:$PATH

WORKDIR ${LAMBDA_TASK_ROOT}
COPY apps/db-migrate-lambda/package.json ./
RUN npm install --omit=dev

COPY apps/db-migrate-lambda/dist/*.js ./
COPY libs/database/flyway/sql /sql/db

CMD ["handler.handler"]
