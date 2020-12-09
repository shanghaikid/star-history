import axios from "axios";

// number of sample requests to do
const sampleNum = 15;

// return [1,2, ..., n]
const range = (n) => Array.apply(null, { length: n }).map((_, i) => i + 1);

/**
 * get star history
 * @param {String} repo - eg: 'timqian/jsCodeStructure'
 * @param {String} token - github access token
 * @return {Array} history - eg: [{date: 2015-3-1,starNum: 12}, ...]
 */
async function getStarHistory(repo, token) {
  var storedHistory = localStorage.getItem(repo);
  if (storedHistory) {
    storedHistory = JSON.parse(storedHistory);
    return storedHistory;
  }
  const axiosGit = axios.create({
    headers: {
      Accept: "application/vnd.github.v3.star+json",
      Authorization: token ? `token ${token}` : undefined,
    },
  });

  /**
   * generate Urls and pageNums
   * @param {sting} repo - eg: 'timqian/jsCodeStructure'
   * @return {object} {sampleUrls, pageIndexes} - urls to be fatched(length <=10) and page indexes
   */
  async function generateUrls(repo) {
    const initUrl = `https://api.github.com/repos/${repo}/forks`; // used to get star info
    const initRes = await axiosGit.get(initUrl);

    /**
     * link Sample (no link when star < 30):
     * <https://api.github.com/repositories/40237624/stargazers?access_token=2e71ec1017dda2220ccba0f6922ecefd9ea44ac7&page=2>;
     * rel="next",
     * <https://api.github.com/repositories/40237624/stargazers?access_token=2e71ec1017dda2220ccba0f6922ecefd9ea44ac7&page=4>;
     * rel="last"
     */
    const link = initRes.headers.link;

    const pageNum = link ? /next.*?page=(\d*).*?last/.exec(link)[1] : 1; // total page number

    // used to calculate total stars for this page
    const pageIndexes =
      pageNum <= sampleNum
        ? range(pageNum).slice(1, pageNum)
        : range(sampleNum).map(
            (n) => Math.round((n / sampleNum) * pageNum) - 1
          ); // for bootstrap bug

    // store sampleUrls to be requested
    const sampleUrls = pageIndexes.map(
      (pageIndex) => `${initUrl}?page=${pageIndex}`
    );

    console.log("pageIndexes", pageIndexes);
    return { firstPage: initRes, sampleUrls, pageIndexes, pageNum, initUrl };
  }

  const { initUrl, pageNum } = await generateUrls(repo);

  let res = [];
  const EightMonth = 60000 * 60 * 24 * 30 * 36;
  let limit = 0;
  for (var i = 0; i < pageNum; i++) {
    const url = `${initUrl}?page=${i}&sort=oldest`;
    let c = false;
    const result = await axiosGit.get(url).catch((err) => {
      c = true;
    });
    if (c) {
      continue;
    }
    if (limit === 0) {
      limit = new Date(result.data[0].created_at).getTime() + EightMonth;
    }
    limit = limit > new Date().getTime() ? new Date().getTime() : limit;
    console.log('start time', new Date(result.data[0].created_at));
    console.log('limit is', new Date(limit));
    let b = false;
    result.data.forEach((star) => {
      if (new Date(star.created_at).getTime() >= limit) {
        b = true;
        return;
      }
      res.push(star);
      console.log(res.length);
    });
    if (b) {
      break;
    }
  }

  let dateMap = {};

  res.forEach((point) => {
    dateMap[point.created_at.slice(0, 7)] =
      dateMap[point.created_at.slice(0, 7)] || [];
    dateMap[point.created_at.slice(0, 7)].push(point);
  });
  let history = [
    {
      data: 0,
      starNum: 0,
    },
  ];
  let totolCount = 0;
  Object.keys(dateMap)
    .sort()
    .forEach((key, i) => {
      totolCount += dateMap[key].length;
      history.push({
        date: i,
        starNum: totolCount,
      });
    });

  if (repo === "milvus-io/milvus") {
    history.splice(1, 1);
  }

  localStorage.setItem(repo, JSON.stringify(history));

  console.log(dateMap);

  return history;
}

export default getStarHistory;
