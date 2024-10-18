
export function isValidForSignin({ uid}: { uid: any}) {
    return  uid && typeof uid === "string"
    // email && typeof email === "string" &&
}
export function IsValidForSignup({email, uid, phoneNumber, photoUrl, firstName, lastName}: {email:any, uid:any, phoneNumber:any, photoUrl:any, firstName:any, lastName:any}):boolean
{
    return uid && typeof uid === "string" &&    
        email === null || typeof email === "string" &&
        (phoneNumber === null || typeof phoneNumber === "string") &&
        (photoUrl === null || typeof photoUrl === "string") &&
        (firstName === null || typeof firstName === "string") &&
        (lastName === null || typeof lastName === "string");
}
