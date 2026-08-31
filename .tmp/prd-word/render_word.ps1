$ErrorActionPreference = 'Stop'
$inputDocx = (Resolve-Path 'Doc\PRD\AMR V1.0.0需求文档-研发实施版.docx').Path
$outputPdf = Join-Path (Resolve-Path '.tmp\prd-word').Path 'AMR-PRD-render.pdf'
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
    $doc = $word.Documents.Open($inputDocx, $false, $true)
    try {
        $doc.ExportAsFixedFormat($outputPdf, 17)
    }
    finally {
        $doc.Close($false)
    }
}
finally {
    $word.Quit()
}
Write-Output $outputPdf
