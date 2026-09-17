import { TErrorSources, TGenericErrorResponse } from "../types/error";

const handleDuplicateError = (err: any): TGenericErrorResponse => {
    const match = err.message.match(/"([^"]*)"/);

    const extractedMessage = match && match[1];

    const errorSources: TErrorSources = [
        {
            path: "",
            message: `${extractedMessage} finns redan`,
        },
    ];

    const statusCode = 400;

    return {
        statusCode,
        message: "Duplicerat värde",
        errorSources,
    };
};

export default handleDuplicateError;
