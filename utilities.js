
function exportContact(contact)
{
    var arr = []
    
    function push16(i)
    {
        arr.push(i & 255)
        arr.push((i>>8) & 255);
    }
    
    function push32(i)
    {
        push16(i)
        arr.push((i>>16) & 255);
        arr.push((i>>24) & 255);
    }

    function push(x)
    {
        if(typeof x === "string")
        {
            x.split('').map(i=>i.charCodeAt(0)).forEach(i=>arr.push(i))
        }
    }

    function hexPush(x)
    {
        if(x.length % 2) x = '0' + x;
        x.match(/.{2}/g).map(i=>arr.push(parseInt(i, 16)))
    }

    function hexLen(x)
    {
        if(x.length % 2) x = '0' + x;
        return x.length / 2;
    }

    // Person
    push16(contact.person.identity.length)
    push16(hexLen(contact.person.salt))
    push16(hexLen(contact.person.pub))            

    push(contact.person.identity)
    hexPush(contact.person.salt)
    hexPush(contact.person.pub)
    
    // Scrypt
    push32(contact.scrypt.N);
    push32(contact.scrypt.P);
    push32(contact.scrypt.R);
    push32(contact.scrypt.len);

    // DH
    push16(hexLen(contact.dh.modulus))
    push16(hexLen(contact.dh.generator))
    
    hexPush(contact.dh.modulus)
    hexPush(contact.dh.generator)

    return Buffer.from(arr);
}

exports.exportContact = exportContact