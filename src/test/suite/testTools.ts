export function removeDuplicateIdErrors(str: string): string {
    // eslint-disable-next-line no-control-regex
    const dupIdError = new RegExp("Error: Duplicate ID .*\n.*\n", "g")
    // eslint-disable-next-line no-control-regex
    const dupIdWarning = new RegExp("Warning: The first occurrence of ID .*\n.*\n", "g")
    str = str.replace(dupIdError, "")
    str = str.replace(dupIdWarning, "")
    return str
}