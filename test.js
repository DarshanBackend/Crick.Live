import fs from 'fs'
import cricketApiService from './services/cricketApi.service.js';


async function resLiveMatchTest() {
  const { data } = await cricketApiService.getMatchLive();
  fs.writeFileSync("live_match.json",JSON.stringify(data))
}

// resLiveMatchTest();

async function resMatchInfoTest(matchId) {
  const { data } = await cricketApiService.getMatchInfo(matchId);
  fs.writeFileSync("match_linfo.json",JSON.stringify(data))
}

await resMatchInfoTest(132791)