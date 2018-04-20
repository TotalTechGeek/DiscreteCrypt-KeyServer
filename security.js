const crypto = require('crypto')
const scrypt = require('scrypt-js')
const bigInt = require('big-integer')

function createHmac(data)
{
    var result = crypto.createHmac(this.config.security.hash, this.config.security.key)
    
    if(Array.isArray(data))
    {
        data.forEach(i=>result=result.update(i))
    }
    else
    {
        result = result.update(data)
    }
    

    return result.digest('hex')
}

function verifyHmac(data, hmac)
{
    return this.createHmac(data) === hmac
}

function toHexString(byteArray) 
{
    var s = '';
    byteArray.forEach(byte =>
    {
        s += ('0' + (byte & 0xFF).toString(16)).slice(-2);
    });
    return s;
}

function exchangeTrial(contact)
{
    let public = bigInt(contact.person.pub, 16)
    let generator = bigInt(contact.dh.generator, 16)
    let modulus = bigInt(contact.dh.modulus, 16)

    let priv = bigInt(crypto.randomBytes(32).toString('hex'), 16)
    let salt = toHexString([...crypto.randomBytes(32)])
    let challenge = generator.modPow(priv, modulus).toString(16);
    let result = public.modPow(priv, modulus).toString(16);

    // challenge = [...new Buffer(challenge, 'hex')]
    result = [...new Buffer(result, 'hex')]

    // Short-hand
    const conf = this.config.security.scrypt
    
    let ret = new Promise((resolve, reject) =>
    {
        scrypt(result, new Buffer(salt, 'hex'), conf.N, conf.R, conf.P, conf.len, (x, y, z) =>
        {
            if(z)
            {
                let res = {
                    hmac: this.createHmac([toHexString(z), JSON.stringify(contact)]),
                    salt: salt, 
                    challenge: challenge,
                    scrypt: conf
                }
                resolve(res) 
            }
        })
    })

    return ret
}


function Security(config)
{
    if (!(this instanceof Security)) 
    {
        return new Security(config);
    }

    this.config = config;
}

Security.prototype.createHmac = createHmac
Security.prototype.verifyHmac = verifyHmac
Security.prototype.exchangeTrial = exchangeTrial
module.exports = Security


