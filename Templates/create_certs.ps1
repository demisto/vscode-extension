# flag to keep track of whether we're between BEGIN/END
$inCert = $false

# suppress stderr output from openssl, assign all output from switch to `$certs`
$certs = switch -Regex ("`n`n"|openssl s_client -connect github.com:443 -showcerts 2>$null){
  '-BEGIN CERTIFICATE-' {
    # alright, we encountered a BEGIN line, prepare to consume following lines as a cert
    $partialCert = @() + $_
    $inCert = $true
  }
  '-END CERTIFICATE-' {
    # reach END, output the current certificate
    $partialCert += $_
    $inCert = $false
    $partialCert -join [System.Environment]::NewLine
  }
  default {
    # ignore anything as long as we're not in between BEGIN/END
    if($inCert){
      $partialCert += $_
    }
  }
}

echo $certs | Out-File -FilePath $args[0]