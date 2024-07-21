module.exports = {
    // you can host your own and just use that instead of these free apis I provided.
    // api consumet github https://github.com/consumet/api.consumet.org (hosting guide in their github)
    // host this api here -> https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fconsumet%2Fapi.consumet.org
    consumet_apis: [
        'https://zerotenki.vercel.app/',
        'https://consumetgobrr.vercel.app/',
        'https://consumet2.vercel.app/'
    ],

    // you can host your own and just use that instead of these free apis I provided.
    // aniwatch api github https://github.com/ghoshRitesh12/aniwatch-api (hosting guide in their github)
    // host this api here -> https://vercel.com/new/clone?repository-url=https://github.com/ghoshRitesh12/aniwatch-api
    aniwatch_apis: [
        'https://hianime-api-beige.vercel.app/',
        'https://hianime2.vercel.app/',
        'https://finalnime.vercel.app/'
    ]

    // Notes:
    // - hosting your own api server might be the safest and fast since youre the only one using it.
    // - I request hosting on vercel or render. I dont absolutely recommend locally but do as you please.
    // - also host more than 1 api for these, so not all work is requested againts one api.
}