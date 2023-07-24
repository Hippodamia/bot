export function randomUser() {

    function randomUsername() {
        let username = "";
        const characters = "abcdefghijklmnopqrstuvwxyz";
        const characterLength = characters.length;
        for (let i = 0; i < Math.floor(Math.random() * 10) + 1; i++) {
            username += characters.charAt(Math.floor(Math.random() * characterLength));
        }
        return username;
    }

    function randomId() {
        let id = "";
        const characters = "0123456789";
        const characterLength = characters.length;
        for (let i = 0; i < 16; i++) {
            id += characters.charAt(Math.floor(Math.random() * characterLength));
        }
        return id;
    }

    return {id: randomId(), name: randomUsername()}
}


