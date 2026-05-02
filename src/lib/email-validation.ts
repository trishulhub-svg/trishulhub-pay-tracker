// Disposable email domain list - blocks temp mail services
const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com', 'guerrillamail.com', 'mailinator.com', 'tempmail.com',
  'throwaway.email', 'yopmail.com', 'sharklasers.com', 'guerrillamailblock.com',
  'grr.la', 'dispostable.com', 'maildrop.cc', 'mailnesia.com', 'tempail.com',
  'tempmailaddress.com', 'throwawaymail.com', 'trashmail.com', 'trashmail.ws',
  'fakeinbox.com', 'mailcatch.com', 'mailexpire.com', 'mailmoat.com',
  'mailnull.com', 'mailshell.com', 'mailzilla.com', 'nomail.xl.cx',
  'nwldx.com', 'oopi.org', 'rmqkr.net', 's0ny.net', 'safersignup.de',
  'safetymail.info', 'safetypost.de', 'saynotospams.com', 'scbox.one',
  'schafmail.de', 'schrott-email.de', 'secretemail.de', 'secure-mail.biz',
  'secure-mail.cc', 'selfdestructingmail.com', 'sendfree.org', 'sendnow.win',
  'sendspamhere.com', 'senseless-entertainment.com', 'server.ms', 'sharklasers.com',
  'shieldemail.com', 'shiftmail.com', 'shitmail.me', 'shitmail.org',
  'shortmail.net', 'sibmail.com', 'sinnlos-mail.de', 'slapsfromlastnight.com',
  'slushmail.com', 'smashmail.de', 'smelllater.com', 'smellfear.com',
  'snakemail.com', 'sneakmail.de', 'sofimail.com', 'solvemail.info',
  'spam.la', 'spam.su', 'spamavert.com', 'spambob.net', 'spambog.ru',
  'spambox.info', 'spambox.org', 'spambox.us', 'spamcannon.com',
  'spamcero.com', 'spamcon.org', 'spamcorptastic.com', 'spamcowboy.com',
  'spamday.com', 'spamex.com', 'spamfree24.org', 'spamgoes.in',
  'spaminator.de', 'spamkill.info', 'spaml.com', 'spammotel.com',
  'spamobox.com', 'spamoff.de', 'spamsalad.in', 'spamslicer.com',
  'spamspot.com', 'spamthis.co.uk', 'spamthisplease.com', 'spamtrail.com',
  'speed.1s.fr', 'spikio.com', 'spoofmail.de', 'spr.io', 'spybox.de',
  'squizzy.de', 'sry.li', 'ssl0.org', 'startkeys.com', 'stinkefinger.net',
  'stop-my-spam.com', 'stuffmail.de', 'supermailer.jp', 'superstachel.de',
  'suremail.info', 'svk.jp', 'sweetxxx.de', 'tagmymail.com', 'talkinator.com',
  'teflon.com', 'teleworm.com', 'teleworm.us', 'temp-mail.com', 'temp-mail.org',
  'tempail.com', 'tempalias.com', 'tempe-mail.com', 'tempemail.biz',
  'tempemail.co.za', 'tempemail.com', 'tempemail.net', 'tempinbox.co.uk',
  'tempinbox.com', 'tempmail.co.uk', 'tempmail.com', 'tempmail.de',
  'tempmail.eu', 'tempmail.it', 'tempmail2.com', 'tempmaildemo.com',
  'tempmailer.com', 'tempmailer.de', 'tempomail.fr', 'temporarily.de',
  'temporarioemail.com.br', 'temporaryemail.net', 'temporaryemail.org',
  'temporaryforwarding.com', 'temporaryinbox.com', 'temporarymailaddress.com',
  'tempsky.com', 'tempthe.net', 'tempymail.com', 'test.com',
  'thc.st', 'thecloudindex.com', 'thelimestones.com', 'thismail.net',
  'thisurl.biz', 'throwam.com', 'throwawayemailaddress.com', 'throwawaymail.com',
  'throwawaymail.pp.ua', 'tilien.com', 'tittbit.in', 'tizi.com',
  'tmail.ws', 'tmailinator.com', 'toomail.biz', 'topmail2.com',
  'tormail.org', 'tospage.com', 'tradermail.info', 'tranceversal.com',
  'trash-amil.com', 'trash-mail.at', 'trash-mail.cf', 'trash-mail.com',
  'trash-mail.de', 'trash-mail.ga', 'trash-mail.gq', 'trash-mail.ml',
  'trash-mail.tk', 'trash2009.com', 'trash2010.com', 'trash2011.com',
  'trashcanmail.com', 'trashemail.de', 'trashmail.at', 'trashmail.com',
  'trashmail.de', 'trashmail.io', 'trashmail.me', 'trashmail.net',
  'trashmail.org', 'trashmail.ws', 'trashmailer.com', 'trashymail.com',
  'trbvm.com', 'trbvn.com', 'trickmail.net', 'twinmail.de',
  'tyldd.com', 'uggsrock.com', 'umail.net', 'unimark.org',
  'unmail.ru', 'upliftnow.com', 'uplipht.com', 'uroid.com',
  'us.af', 'username.e4ward.com', 'utiket.us', 'ux.uk.to',
  'uyu.tw', 'victorycare.com', 'victoriantwins.com', 'vidchart.com',
  'vipmail.name', 'vipmail.ru', 'vipxm.net', 'viralplays.com',
  'visal007.com', 'visal168.com', 'vm.co.ua', 'vmani.com',
  'vmpanda.com', 'vnot.es', 'voala.com', 'volki.ru',
  'vpn.st', 'vrmtr.com', 'vsimcard.com', 'vubby.com',
  'w3internet.co.uk', 'wakingu.com', 'walkmail.net', 'wallm.com',
  'wasteland.rfc822.org', 'watchever.biz', 'watchfull.net', 'wbml.net',
  'web-ideal.fr', 'web-mail.cloud', 'web2mailco.com', 'webcontact-france.eu',
  'webemail.me', 'webm4il.info', 'webmail.igg.biz', 'webmail.name',
  'webmail24.net', 'webuser.in', 'wee.my', 'wefjo.grn.cc',
  'weg-werf-email.de', 'wegwerf-email-addressen.de', 'wegwerf-email.de',
  'wegwerf-email.net', 'wegwerf-email.org', 'wegwerfmail.de',
  'wegwerfmail.info', 'wegwerfmail.net', 'wegwerfmail.org',
  'wh4f.org', 'whatiaas.com', 'whatpaas.com', 'whatsaas.com',
  'whopy.com', 'wibblesmith.com', 'wickmail.net', 'widget.gg',
  'wilemail.com', 'willhackforfood.biz', 'willselfdestruct.com',
  'winemaven.info', 'wins.com.br', 'wmail.cf', 'wolfsmail.tk',
  'wovz.cu.cc', 'wr.moeri.org', 'wralaw.com', 'writeme.us',
  'wronghead.com', 'wuzup.net', 'wuzupmail.net', 'www.e4ward.com',
  'www.newyorksocialist.com', 'x24.com', 'xagloo.co', 'xemaps.com',
  'xents.com', 'xjoi.com', 'xmail.com', 'xmaily.com',
  'xn--9kq967o.com', 'xoxox.cc', 'xrho.com', 'xy9ce.tk',
  'yabai-oppai.com', 'yahmail.top', 'yamail.win', 'yandexmail.com',
  'yedi.org', 'yep.it', 'yhg.biz', 'ynmrealty.com',
  'yomail.info', 'yoo.ro', 'yopmail.com', 'yopmail.fr',
  'yopmail.gq', 'yopmail.net', 'yopmail.org', 'yopmail.pp.ua',
  'yopmail2.com', 'yordanmail.cf', 'yourdomain.com', 'youremail.cf',
  'youmail.ga', 'youmailr.com', 'youneedmore.info', 'yourlms.biz',
  'yspend.com', 'ytpayy.com', 'z0d.eu', 'z1p.biz',
  'z86.ru', 'za.com', 'zebins.com', 'zebins.eu',
  'zehnminuten.de', 'zehnminutenmail.de', 'zemia.de', 'zep-hr.com',
  'zetmail.com', 'zippymail.info', 'zipsendtest.com', 'zoaxe.com',
  'zoemail.com', 'zoemail.net', 'zoemail.org', 'zomg.info',
  'zumpul.com', 'zv68.com', 'zxcv.com', 'zxcvbnm.com',
  'zzz.com',
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return true;
  if (DISPOSABLE_DOMAINS.has(domain)) return true;

  // Block obvious patterns
  if (domain.includes('temp') || domain.includes('trash') || domain.includes('spam') || domain.includes('fake') || domain.includes('throw') || domain.includes('disposable')) {
    return true;
  }

  return false;
}

// Common valid email domains for quick validation
const VALID_DOMAINS = new Set([
  'gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'yahoo.co.uk',
  'icloud.com', 'me.com', 'mac.com', 'protonmail.com', 'proton.me',
  'live.com', 'live.co.uk', 'msn.com', 'aol.com', 'zoho.com',
  'mail.com', 'gmx.com', 'gmx.co.uk', 'yandex.com',
  'tutanota.com', 'tuta.io', 'fastmail.com', 'pm.me',
  'qq.com', '163.com', '126.com', 'sina.com', 'foxmail.com',
  'naver.com', 'daum.net', 'hanmail.net',
  'company.co.uk', 'company.com', 'org.uk', 'org.com',
  'co.uk', 'ac.uk', 'gov.uk', 'nhs.uk', 'police.uk',
]);

export function isLikelyValidEmailDomain(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;

  // Check basic email format
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) return false;

  // If it's a known valid domain, pass
  if (VALID_DOMAINS.has(domain)) return true;

  // If it's a disposable domain, fail
  if (isDisposableEmail(email)) return false;

  // For unknown domains, allow but they went through the disposable check
  return true;
}
