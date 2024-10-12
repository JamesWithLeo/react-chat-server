
export function isValidForSignin({email, uid}: {email:any, uid: any}) {
    return email && typeof email === "string" &&
    uid && typeof uid === "string"
}
export function IsValidForSignup({email, uid, phoneNumber, photoUrl, firstName, lastName}: {email:any, uid:any, phoneNumber:any, photoUrl:any, firstName:any, lastName:any}):boolean
{
    return email && typeof email === "string" &&
           uid && typeof uid === "string" &&

           (phoneNumber === null || typeof phoneNumber === "string") &&
           (photoUrl === null || typeof photoUrl === "string") &&
           (firstName === null || typeof firstName === "string") &&
           (lastName === null || typeof lastName === "string");
}
