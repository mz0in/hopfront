import {useEffect, useState} from "react";
import {OpenAPIV3} from "openapi-types";
import {OperationResponseBodyObject} from "./OperationResponseBodyObject";
import {ResponseAlert} from "../../alert/ResponseAlert";
import {getMediaType, resolveSchemaFromSchemaOrReference} from "@/app/lib/openapi/utils";
import {ApiContext} from "@/app/lib/model/ApiContext";
import {ResponseSchemaSelectedObserver} from "@/app/lib/model/ResponseSchemaSelectedObserver";
import {EnhancedTable} from "@/app/components/table/EnhancedTable";
import EmptyTable from "../../table/EmptyTable";
import ResponseObject = OpenAPIV3.ResponseObject;
import ArraySchemaObject = OpenAPIV3.ArraySchemaObject;
import Typography from "@mui/joy/Typography";
import {buildSuccessBodyOrProblem} from "@/app/components/operation/response/utils";
import {ErrorAlert} from "@/app/components/operation/response/ErrorAlert";
import {ProblemAlert} from "@/app/components/alert/ProblemAlert";
import {StandaloneOperation} from "@/app/lib/model/StandaloneOperation";
import {AuthService} from "@/app/lib/service/AuthService";
import {ApiAuthenticationStatus} from "@/app/lib/model/ApiAuthenticationStatus";

interface OperationResponseProps {
    operation: StandaloneOperation
    response: Response
    onRefreshNeeded: () => void
    loading?: boolean
    responseSchemaSelectedObserver?: ResponseSchemaSelectedObserver
    apiContext: ApiContext
}

export const OperationResponse = ({
                                      operation,
                                      response,
                                      onRefreshNeeded,
                                      loading,
                                      responseSchemaSelectedObserver,
                                      apiContext
                                  }: OperationResponseProps) => {

    const openAPIResponses = operation.operation.responses;

    const [responseText, setResponseText] = useState<string | undefined>();
    const [authStatus, setAuthStatus] = useState<ApiAuthenticationStatus | undefined>();

    useEffect(() => {
        if (!response) {
            return;
        }

        if (!response.bodyUsed) {
            response.text()
                .then(text => {
                    setAuthStatus(AuthService.getApiAuthenticationStatus(apiContext));
                    setResponseText(text);
                });
        }
    }, [response, responseText]);

    const {body, problem} = buildSuccessBodyOrProblem(response.status, responseText);

    if (problem) {
        return <ProblemAlert problem={problem} authenticationContext={authStatus && {
            authenticationStatus: authStatus,
            apiSpecId: apiContext.apiSpec.id
        }}/>;
    }

    if (!body) {
        return <ResponseAlert response={response} operation={operation.operation}/>
    }

    const contentType = response.headers.get('content-type');

    if (!contentType) {
        return <div>no content type</div>;
    }

    const openAPIResponse = openAPIResponses[response.status];
    const openAPIResponseObject: ResponseObject | undefined = openAPIResponse as ResponseObject;
    const mediaType = getMediaType(openAPIResponseObject, contentType);

    if (!mediaType) {
        return <ErrorAlert error={new Error("Couldn't find schema for response object")}/>
    }

    if (Array.isArray(body)) {
        const schema =
            mediaType.schema && resolveSchemaFromSchemaOrReference(mediaType.schema, apiContext.apiSpec.document) as ArraySchemaObject;

        if (body.length > 0 && typeof body[0] === 'object') {
            return <EnhancedTable
                rows={body}
                schema={schema}
                loading={loading}
                onRefreshNeeded={onRefreshNeeded}
                apiContext={apiContext}
                responseSchemaSelectedObserver={responseSchemaSelectedObserver}/>;
        } else {
            return <EmptyTable/>;
        }
    } else if (typeof body === 'object') {
        if (!mediaType.schema) {
            return <OperationResponseBodyObject
                body={body}
                mediaType={mediaType}
                loading={loading}
                responseSchemaSelectedObserver={responseSchemaSelectedObserver}
                apiContext={apiContext}/>;
        } else {
            const schema = resolveSchemaFromSchemaOrReference(mediaType.schema, apiContext.apiSpec.document);

            const schemaPropertyNames = schema.properties ? Object.keys(schema.properties) : [];

            if (schema.properties && schemaPropertyNames.length === 1) {
                const arrayPropertyName = schemaPropertyNames[0];

                const onlyPropertySchema =
                    resolveSchemaFromSchemaOrReference(schema.properties[arrayPropertyName], apiContext.apiSpec.document);

                if (onlyPropertySchema.type === "array") {
                    if (body[arrayPropertyName]?.length === 0) {
                        return <EmptyTable/>;
                    }
                    return <EnhancedTable
                        rows={body[arrayPropertyName]}
                        schema={onlyPropertySchema}
                        loading={loading}
                        onRefreshNeeded={onRefreshNeeded}
                        apiContext={apiContext}
                        responseSchemaSelectedObserver={responseSchemaSelectedObserver}/>;

                }
            } else if (schema.properties && schemaPropertyNames.length === 2) {
                const pagePropertyPageNameIndex = schemaPropertyNames.map(value => value.toLowerCase()).indexOf("page");

                if (pagePropertyPageNameIndex) {
                    const otherPropertyName = schemaPropertyNames
                        .find((value, index) => index !== pagePropertyPageNameIndex);

                    if (otherPropertyName) {
                        const otherPropertySchema =
                            resolveSchemaFromSchemaOrReference(schema.properties[otherPropertyName], apiContext.apiSpec.document);

                        if (otherPropertySchema.type === "array") {
                            return <EnhancedTable
                                rows={body[otherPropertyName]}
                                schema={otherPropertySchema}
                                loading={loading}
                                onRefreshNeeded={onRefreshNeeded}
                                apiContext={apiContext}
                                responseSchemaSelectedObserver={responseSchemaSelectedObserver}/>;
                        }
                    }

                }
            }

            return <OperationResponseBodyObject
                body={body}
                mediaType={mediaType}
                loading={loading}
                responseSchemaSelectedObserver={responseSchemaSelectedObserver}
                apiContext={apiContext}/>;
        }
    } else {
        return (
            <div>
                <Typography>unknown type: {typeof body}</Typography>
                <Typography>{body}</Typography>
            </div>
        );
    }
}