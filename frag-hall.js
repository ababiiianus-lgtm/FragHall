const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const zlib = require("zlib");
const childProcess = require("child_process");

const port = process.env.PORT || 3000;
const dataDirectory = process.env.DATA_DIR || path.join(__dirname, "data");
const filesDirectory = path.join(dataDirectory, "files");
const databaseFile = path.join(dataDirectory, "db.json");
const maxFileSize = 100 * 1024 * 1024;
const maxImageSize = 3 * 1024 * 1024;
const maxAvatarSize = 1024 * 1024;
const validGames = ["doom", "quake", "sam"];
const chatChannels = ["all", "doom", "quake", "sam"];
const rankLimits = [0, 20, 60, 150, 400, 1000];

const pages = {

    html: String.raw`<!DOCTYPE html>
<html lang="ro">

<head>

    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Frag Hall</title>
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMDAgMzAwIiB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCI+CiAgPGRlZnM+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9InN0ZWVsZiIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiNlM2U2ZWIiLz48c3RvcCBvZmZzZXQ9IjAuMzUiIHN0b3AtY29sb3I9IiM3YjgwOGEiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIwLjY1IiBzdG9wLWNvbG9yPSIjMmQzMDM3Ii8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjYThhZGI3Ii8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJmbGFtZWYiIHgxPSIwIiB5MT0iMSIgeDI9IjAiIHkyPSIwIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmYzYjE0Ii8+PHN0b3Agb2Zmc2V0PSIwLjYiIHN0b3AtY29sb3I9IiNmZjdhMWEiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNmZmIwMmUiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8ZmlsdGVyIGlkPSJibHVyZiIgeD0iLTQwJSIgeT0iLTQwJSIgd2lkdGg9IjE4MCUiIGhlaWdodD0iMTgwJSI+PGZlR2F1c3NpYW5CbHVyIHN0ZERldmlhdGlvbj0iNyIvPjwvZmlsdGVyPgogICAgPGZpbHRlciBpZD0iY29yZWYiIHg9Ii02MCUiIHk9Ii02MCUiIHdpZHRoPSIyMjAlIiBoZWlnaHQ9IjIyMCUiPjxmZUdhdXNzaWFuQmx1ciBzdGREZXZpYXRpb249IjkiLz48L2ZpbHRlcj4KICAgIDxjbGlwUGF0aCBpZD0iY2xpcGYiPjxwb2x5Z29uIHBvaW50cz0iMTUwLjAsMjEuNyAyNDMuMCw0OS42IDI3Mi44LDExNC43IDI1Mi4zLDIwMi4xIDE1MC4wLDI4MC4yIDQ3LjcsMjAyLjEgMjcuMiwxMTQuNyA1Ny4wLDQ5LjYiLz48L2NsaXBQYXRoPgogIDwvZGVmcz4KICAKICA8cG9seWdvbiBwb2ludHM9IjE1MC4wLDEyLjAgMjUwLjAsNDIuMCAyODIuMCwxMTIuMCAyNjAuMCwyMDYuMCAxNTAuMCwyOTAuMCA0MC4wLDIwNi4wIDE4LjAsMTEyLjAgNTAuMCw0Mi4wIiBmaWxsPSIjMTMwYzBiIi8+CiAgPGcgY2xpcC1wYXRoPSJ1cmwoI2NsaXBmKSI+CiAgICA8cGF0aCBkPSJNNTguMCwyNDQuMCBWMTU2LjYgUTU4LjAsMTEyLjMgMTUwLjAsNzYuMCBRMjQyLjAsMTEyLjMgMjQyLjAsMTU2LjYgVjI0NC4wIFoiIGZpbGw9IiMxYzBhMDciIHN0cm9rZT0iIzAwMDAwMCIgc3Ryb2tlLXdpZHRoPSIxLjYiIHN0cm9rZS1vcGFjaXR5PSIwLjU1Ii8+CiAgICA8cGF0aCBkPSJNNzAuNCwyMzAuMCBWMTU0LjQgUTcwLjQsMTE2LjEgMTUwLjAsODQuNyBRMjI5LjYsMTE2LjEgMjI5LjYsMTU0LjQgVjIzMC4wIFoiIGZpbGw9IiMzMzEwMGEiIHN0cm9rZT0iIzAwMDAwMCIgc3Ryb2tlLXdpZHRoPSIxLjYiIHN0cm9rZS1vcGFjaXR5PSIwLjU1Ii8+CiAgICA8cGF0aCBkPSJNODIuOCwyMTYuMCBWMTUyLjIgUTgyLjgsMTE5LjkgMTUwLjAsOTMuNCBRMjE3LjIsMTE5LjkgMjE3LjIsMTUyLjIgVjIxNi4wIFoiIGZpbGw9IiM1ZTE2MDkiIHN0cm9rZT0iIzAwMDAwMCIgc3Ryb2tlLXdpZHRoPSIxLjYiIHN0cm9rZS1vcGFjaXR5PSIwLjU1Ii8+CiAgICA8cGF0aCBkPSJNOTUuMywyMDIuMCBWMTUwLjAgUTk1LjMsMTIzLjYgMTUwLjAsMTAyLjAgUTIwNC43LDEyMy42IDIwNC43LDE1MC4wIFYyMDIuMCBaIiBmaWxsPSIjOWEyNDEwIiBzdHJva2U9IiMwMDAwMDAiIHN0cm9rZS13aWR0aD0iMS42IiBzdHJva2Utb3BhY2l0eT0iMC41NSIvPgogICAgPHBhdGggZD0iTTEwNy43LDE4OC4wIFYxNDcuOCBRMTA3LjcsMTI3LjQgMTUwLjAsMTEwLjcgUTE5Mi4zLDEyNy40IDE5Mi4zLDE0Ny44IFYxODguMCBaIiBmaWxsPSIjZmYzYjE0IiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMS42IiBzdHJva2Utb3BhY2l0eT0iMC41NSIvPgogICAgPHBhdGggZD0iTTEyMC4xLDE3NC4wIFYxNDUuNiBRMTIwLjEsMTMxLjIgMTUwLjAsMTE5LjQgUTE3OS45LDEzMS4yIDE3OS45LDE0NS42IFYxNzQuMCBaIiBmaWxsPSIjZmZiMDJlIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMS42IiBzdHJva2Utb3BhY2l0eT0iMC41NSIvPgogICAgPHBhdGggZD0iTTEzMi41LDE2MC4wIFYxNDMuNCBRMTMyLjUsMTM1LjAgMTUwLjAsMTI4LjEgUTE2Ny41LDEzNS4wIDE2Ny41LDE0My40IFYxNjAuMCBaIiBmaWxsPSIjZmZmMmNmIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMS42IiBzdHJva2Utb3BhY2l0eT0iMC41NSIvPgogICAgPGVsbGlwc2UgY3g9IjE1MCIgY3k9IjE0OCIgcng9IjMwIiByeT0iMzQiIGZpbGw9IiNmZmYyY2YiIG9wYWNpdHk9IjAuODUiIGZpbHRlcj0idXJsKCNjb3JlZikiLz4KICA8L2c+CiAgPHBvbHlnb24gcG9pbnRzPSIxNTAuMCwxMi4wIDI1MC4wLDQyLjAgMjgyLjAsMTEyLjAgMjYwLjAsMjA2LjAgMTUwLjAsMjkwLjAgNDAuMCwyMDYuMCAxOC4wLDExMi4wIDUwLjAsNDIuMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ1cmwoI3N0ZWVsZikiIHN0cm9rZS13aWR0aD0iMTAiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiLz4KICA8cG9seWdvbiBwb2ludHM9IjE1MC4wLDI1LjggMjQwLjAsNTIuOCAyNjguOCwxMTUuOCAyNDkuMCwyMDAuNCAxNTAuMCwyNzYuMCA1MS4wLDIwMC40IDMxLjIsMTE1LjggNjAuMCw1Mi44IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZjNiMTQiIHN0cm9rZS13aWR0aD0iMi41Ii8+CiAgCiAgCiAgPHBhdGggZD0iTTE1Ni40NywxMjUuODUgQTI1LDI1IDAgMCAxIDE3NC4xNSwxNDMuNTMgTTE3NC4xNSwxNTYuNDcgQTI1LDI1IDAgMCAxIDE1Ni40NywxNzQuMTUgTTE0My41MywxNzQuMTUgQTI1LDI1IDAgMCAxIDEyNS44NSwxNTYuNDcgTTEyNS44NSwxNDMuNTMgQTI1LDI1IDAgMCAxIDE0My41MywxMjUuODUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLW9wYWNpdHk9IjAuNjUiIHN0cm9rZS13aWR0aD0iOCIvPgogIDxwYXRoIGQ9Ik0xNTAsMTEyIFYxMzIgTTE1MCwxNjggVjE4OCBNMTEyLDE1MCBIMTMyIE0xNjgsMTUwIEgxODgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLW9wYWNpdHk9IjAuNjUiIHN0cm9rZS13aWR0aD0iOCIvPgogIDxwYXRoIGQ9Ik0xNTYuNDcsMTI1Ljg1IEEyNSwyNSAwIDAgMSAxNzQuMTUsMTQzLjUzIE0xNzQuMTUsMTU2LjQ3IEEyNSwyNSAwIDAgMSAxNTYuNDcsMTc0LjE1IE0xNDMuNTMsMTc0LjE1IEEyNSwyNSAwIDAgMSAxMjUuODUsMTU2LjQ3IE0xMjUuODUsMTQzLjUzIEEyNSwyNSAwIDAgMSAxNDMuNTMsMTI1Ljg1IiBmaWxsPSJub25lIiBzdHJva2U9IiNmMWU2ZGYiIHN0cm9rZS13aWR0aD0iMy41Ii8+CiAgPHBhdGggZD0iTTE1MCwxMTIgVjEzMiBNMTUwLDE2OCBWMTg4IE0xMTIsMTUwIEgxMzIgTTE2OCwxNTAgSDE4OCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZjFlNmRmIiBzdHJva2Utd2lkdGg9IjMuNSIvPgogIDxjaXJjbGUgY3g9IjE1MCIgY3k9IjE1MCIgcj0iMy40IiBmaWxsPSIjZmYzYjE0IiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMS4yIi8+Cjwvc3ZnPgo=">
    <link rel="icon" type="image/png" sizes="64x64" href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAS8ElEQVR4nO1bCVCUSZaume0Q6q6iiuIoi7soLpH7xgK570OKGwqKGxoRRDxQS/HE9kRBBA9QEMUD8WqURrwX3Rmd2Ojejt3Znd2Iie3Z1pge+9jo2Zhuv43MKhAdD0DbtnvmRbyIpP7Ml+/78uXxvz9hMP4uP450dfVLO7uOle072Fu2t6tLyvi5C4BfHD16xuvw0VNrD/Wc+PX+ruOPOw71oX1/L/a0dz/e1db165179q/dvnu/F6nL+DnI2bNnWf2nPkzsO3m+o/fY4GeHjw6gq+ckDnT3g4Bf07QFq9duQsveLuzccwDbWjqxZUc7Nm9t/Wx98+6Opo07ErXafSzGT0lOXbokOXNuOP/k4FB//+kLXx87eR69xwdxuG8AB7qPY5V2I1KT06CwsYGIw6ZqK5MhLDQC5eULsaG5BRu27MG6zbuwZsMOrGza+u2KNc3Dy1duqqlrXCdjvIvy4cgN5/NDV5eevThyc+Dc5cenBi+hf+AiCPiOA72oW7wcUeGRkBqLKWALHhsFUh72yAVUSZn8Rp6ZCIXwdveCSpWN+qVaNK7ZguWrN6GhcQPql69DbcOaTxbWr9q8sK4xiMFg/DhT5fbt28zh0dvhl0du7hoavvH7C5eu4uzFKzhzfhgE/N6OQygvq0KAjy8kfB4F5mbEQa0lH/sUArTYC5BqxoUplw1jDhvzJVxstBXQZ2tt+PAVcWgbMZcDha0dwsOjUVhUhbqlWiyqX43qukZU1SxH+ftLHpRW1R8uqqhTaTRLuD8o6Fu3fiO5cfte/tUbd/s/ujb29fCVWxj66AYIeAL8g227kZOVCye5nDr/LLA11nz46YG9TN2F3AmiduuJMuHqnlmamcHX2w8pCzJRVlmP0qp6FJfXQVNag/zi6m9zCyqHc/LLajIKCt7sVLn5j/dir9/61eOrN+9i5NoYCPgTp89j2bKViAqPgFSsC+3ZPA6yzXnYIReg3V6ASgserPWhPROdbI8QMtmeiUAAVycXhEfEIDuvBHmaSuSoy5GVV4L07KLHqVkFsW+MgBu3fnWVgO89dhpVldXw8/SGmMt9aWjPFPSL9HlTxWfSVLG1sIKfbyASkjOQllmI1PT8q28E/K1b97yv3vwnjIzehrO9/YxD+03ri6aKVGKCFFUektNykZCS4/faBFy9cffElWtjWL9hC+14p1wAzWwerF4jtN+0El+IT8Q38ndQ8HwkpGQjLimj/7XAX7s2Zn3l+th3w6O3adgrBBxsstV18i5qsx0fjkIOLKWzCXhEx6u+i4xU2c2YgJFrY60EfEtLO+2AgHcSvv1wn6o6CDjYYKOPgnnhiIpNRVh00p4ZgR+6fdtoePTWN5dGbiI8ZD5dkXfpQ+xdVnKwIocqW0trREQnIzQi8X+VynjxtAn46MptLQF/oKuXrrLLrPgIEL+7oz+u5BDVYKU7fAUEhSEkPA7zQqJXTwv86Oio4dDIjf+5ePkaUhNTIOGysdf+zY6+kGUIEdOAKi2/QdudCiHdEeQ2dpgXGoNAZcQDPz8/5tTDf+RmxYeXr+PosQGYGglRPJuHOBPdvv86asRmUbDGzFmQsgwwW6+kbGxoACHTgNZ53X7iTbjUZzGPC7+AUPgHh8M7YH75lMBrtfjlxeHr/3Z+aBT5uQUTjL4ucCOmIUyYTwDPZs2CHduAKimPE0LqEJJel4hxn+W2CvgGzIe3n/I/VCrVP7x69IevLSDgTwxcgKWpKZJNuVBLZzb6Rmw2jJgGkOiBmzMNYMGaBQeuITwFLHjwdUrK5DdLQoS+roQ5C0LmzIkgb5hJplz6MublEwxPn2C4ugemvpKA80NXbp+9OILKioXU0AGFkK4BM5njEkM9cNYsCtyFx4SXkAU3PhP+QiZixUzEiZkIFBrCXcCiz0gdK9YsShYlwnBmawQ5sZJT4ngUuHkFYo67792Xgj/34dVgAv7kmSHYW1shSMxBnSV/2uEuNtSF9PiIO+uBu/NZmCdiId2UDY2Ui1xznZIy+S1YpIsIUpe0IW1nM3VTRjyD9aHekod5xlyaY5jj5gtXdz94egaSPMLzZfDCyNmBc8NYurSRGmiVCyDlTX3rI4uY6cQ8nwUFx4CGtzufiWAjQ2SZsFFkIYDaSoQ6B1Ps9pChxV1GywVWIvosixBBI4I5MTXIGkFsEtukj6n6Y87j0Bc0GgV2DnD3CoKnn3Lw+eCHRu0Gzg1/f2pwCG7OLnARctBkw5/6ImdoMDHq1iwDOtpkNP0ETKSZsFEo5VGQy+bIcETphFOxXhipVFE9GeuFHqUjGl1lKLQSoVDKpW18BUxqh6iV3jbpQ2Q4C6IpRsN6GwFcjTgwFYvh5auEb2Do937KyL8+Hg8MDMlINuf4qQs08UCOvfaCV4++EZtJt7XxUZezDSdGPcrIAAVmHOSZc1FnL0F3sAKDKYG4v7IIf9yzDN2ra9G9ehEe7arHP2vLMJgahK5gBWrlxnRqkLZRQkKmLhoUXEPaB+mL9En6fpV/BAPBYizg090gYF4EgoMjn58wOT5w8b9IHi80OATLrfiUuZcvdCwYj4c804AuYMRRT54hUsWGyDdlId+ci+3OZjgW6oz7ywrwdetSYN8S4PgGdG/XUiVldDTg67aluLdMjT6lE22Tb8alNogtYpPYJmvDUzvFK0iYa6Q7xVqYyxAQHIGg0Oj/fOEa0HfyfA/J4GoKihEq4aJEpjtSPlfZrCcjT8BzdeC9eAbIMmYiV8JCiRkXnc6mOB3thc/WlgPNxXjQtgRHNi3C6Ikd6G5tokrKPZsW4eHeJXi8uZjWPR3tSdsWk4VSwkK2MZPaJn24TCKB+PCy6VAq4yHEmAtHe2cEh0QjJCzuyAsJ6O0frDjSN4C165rp1kdSUS8kYNLe7jQB3pCCzzFmosyMjU5HMc7G+uCr+nSgUYVPWhajt70ZYyPncOLgBnS3b6FKyneunEPP3mb8S2s9sCINX9ZnYJCQ4ChGiTkbucZMSsJ4JJA+x7dKctZ4kZ/kBY5g8fIOIOAxPyrxxSfCnp6BOV29p9B5qA+mRkY00/L81Z7MRV3nNmz9Ss9jIkVkiHwJE/kmTHQoRDgaoMCXlQlAWQgeHGxAb/tGDBxpw93L7cCX9/D570apkjL5baBnL3r2bsTDQ0tpm0dVCej1k1NbBSZMaptMBzf9VLOmp0hdBL7orEAwiHk8+k4QFpmIiLgUlxcSoNVqf3nwcP8fO7uOwcvNg75b2/Cfc8gw1IW+OXMWXaGJM8F8A+pgutgQH9jwsV8hwqeaWCBtDrAqE0e2lGJs5CzuDrcDX90HvroHfPUbvZLyfYxdasOdK2fRs6WUtsECF3yqiaG2mq351Dbpg/SlW2hZkOqnITl7POsnSaCSXcDCXErBR0an/IlgZLxMOrr6Luw7cBSpySp6DM4wf3odMGIyJ0afbHfEETIiC/TOFZqw0GkvxKG5UnyjCQMyPYDeBoweW40TnVrg0Z1J4O/rVU/Cozvo71xN66KnAch0x9eFYTjkKkWnXEhtkz4WiJmTomB8ByJnhKcXROI7OQ47O7ggMiYFMfELzjNeJe37e1e0dR5BTU0DZDwOTTM9TQA5mOgIsJ846OhDX8JEJZn79kL0zXPCoyw/dNdo0L1xCbp3N9IF7/N/v/wE9I1jOtWTQZ7RhbGlUdemRoNHWf7UFiGA2B7vx12/FhAfxv0hvk32dYsdnyZHfH2DEROfhrjk9OWvJGDP/p55e9q7sWXHXhjzuDTD8rzFj8w7J/0oeE8ioFpPwDGlC75M99ETUK8D1boWn/92+EkEPEXAPXz+W0LAWj0B9bQtsUFsEQKI7fF+SJ90MZy0I9D8wiRfie8kmRMZk4z4pAwkLcgJfiUBu3btMtjZdujP23fvh6NcTncCs8kvQ8wn899VT4DPMwR0yEkEOANpboDKFeitxWjvSpzoWAn86c4zoa+fCl/ep8/6963C6NGVtA1tmzaX2up4hgDSJ+mb+EB80RHwZB0gPm+T8yEzNdOBT83+s1qtNmRMRbbv3n9r664OhIdF0NfKKAl3mgQI0BfsAqTOAZIcgUMVOLIpC2Mjg7hzcTvwYBh4eOVpfTCMsQvbdIvg5izahrZNmUNtEZvTISBaonuNd3ZwJuCRkpZ7kzFV+WBXR3Pz9nao1SU007pq8jvBVAiwIwQ4AcnOQIw10F6AB0Nq9LStw8CRVoyd2wh8dgaff3yUKimT3870tKKndS0eDhXQNrRtsjO1RWxOh4DVNroUeUCAEqmqPKRlqjdPmYDmrW2Jm7a2Ylnj+om9dLoEHA1yAhIdgTAZ0JIFXM/FJyeK0bN3HR3l/s416G5bR5WUyW9H2prw6ekS4EYO0JKpa5voSG1Nl4Bxn2PjF0CVWYCsrKKEKROwbVun0frm3d83bdoJK6lUt5hMmwBHIN4BCDEFsj2AZUnAB4V4uHsheho0GN23Dt1bV1Md3ddEfyPPsKVQV5e0IW3jHait6RBAfCWvwVJjCdIyC5CZU/Q4L69KxJiONG3a+Yl2/Xb4+/hjkcWk739TJSCQEKAAgk10QKKtgTRXoFgJNCQB69X6t8FaYJ0aaEgGSubp6kRZ69qQtvEKams6BPiLOKix4MPJwQkZOUXIziv9mDFdWb1u275VTVuRnJxOwRMSpk1AylxdGIdbAlFWQLy9DmCeL1ASgu76MqqkjDw/3TNSh9QlbUjblLnTJoD4Sr4PBAUqkZ1fitzCivZpE7CyaVv+Cm0zSitqaUhNrANTJOCAkwnOR3rpNMobF6J9cCHWFx/GB2AoORiXVSE4lxFJlZTJb+QZqUPqkjbj7Ymt6RBAMlnE54TkdOQVVkCtqc6bNgHLtJtslq0id3PWw1wkenIgmiIBf6VyAT0gdSpE2O8gxgEnYxxwlujUyZj+Rp6ROqTu82xMlQDiq6lQiNyCchQUv4/i4vetGTORhhXr/7t+eRNcnV2xyppPE4yvIoAcV1tt+S9WOwHaiMoFaLM30ikp2wnos5e1rZwCAcRH4qujXEHBF5XW/IExU1m8vKm/rmENVOl5mG0koJciis3ZLyVAJWYiTWw4JVXpder1mS8lIN+MRafqbCEfsXEpKCqrQWnl4pnfEahbsiZj4eJV35NbWfkF5bCRyZBnykabnEc/YjyPgLelkwkg6fNmax6KzTl0207LyKPgSypqv694f0kG43WkunZ5aFXN8j9UVDeguHwRPN08EGDERp+Ch1gxe+JliGSB3qaOvwxFiljUF6WIhbnOLsgrKNOPfO3Dyur6aMabkLLaWmlJ5eKb41fSwsJjYCnkoV3OwxILLtwETDoSb1NJnzWzuTii4MOKx0FQUAjURXTOE/B3y2qWWjHepGi12vcKSxZuLiiufpxXWInEpHTYmpqg0ZKLgwoBfIW6zNDbUG8hCy1yHtZa8WArkSAhKQ3qoio6OCUVtftUWu0sxg8lOZryxBx12RdZeaVITVfDWa5AnISN444ChIlZmMtn/qAaImLhuIMAKRI2nO3skZGjoeALS6u/Kq2oUzHehmRnaywzsjV39ffx4O3lD1suCwfs+Ug3YcGMafCDaIoxC10KPuRcFny8/Og+rxv56vtFlbUzvww1EyHJhdT0vF26+3hZUIZGQSoSoV7GwWZrLiwmXYB4XZWxDLDCkoO1VlzIxCJExyYjV60DX1i68HBpaemPd6U+PjU7Ly4p/ZuYBBXmRyTAWmaBaDELB+35cOLozguvowq2ATrlPCQYs2FnaYXUtFzkqsuQr6n6VlNcU8J4FyQyPtUhMjbl4/DoZMyPTICz0xzI+SwcUggQKdF9P5yJhhizcdhBAAX50OrmSd/sctRlUBdW/mtR0UJXxrskiYmJ3NDIhD7y9YV8hHD38KUXmhut+Viqv7U1HS2X8dBsK4C5kRDzw2KQmVtMwecXVg6o1TUCxrsq80KjSwOVEf/nHxQOT+9Aenc3wZRLb5pM5eY4SWOTmx1pZlxYSWcjPkmlB1/6l3xNxVLGT0F8gyI9ff1Df+ftp6SXEqwsrOk1W0JCsPjF941I3uGggxDOQg5cHF2wID2fgs9Wl/0+T1Plz/gpibd3mMjdO+iCm2cAvZpir3CCGZ9Hr7lXy/jP/Yq7Xc6HVMBHUNB8msfLJNmc/LKPMosWmjB+ovKLOW6+Na7ufn/x8A6Cm4cfzIyNkWXOo/9QQa7fmvE4+MCOT9PvMhMTRMUk0zxeRk7Rdzl5JWte+S3vpyBuXkFKbz/lZ36BYQgICoe9nT08jLg47CigSsqO9g5ISs0aB/8gJ780kvFzEn//CEnAvMiPyA4RGhEPDw8fSAUCmJOrKz4BSFHlUvDp2ZrrmRqNOePnKEql8r3Q8Pjm8Oikx1FxqQiZH42w8Djy1YZ8uHickaNpViq17zF+7hIVl5IYk6j6ghyhCfgF6eovMnM0iYy/JYlXqSyS03LG0tLV9zIy8m0Zf4sSHV1tQPTHdOL/AdWfzoTmLMUzAAAAAElFTkSuQmCC">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Teko:wght@500;700&family=Barlow:wght@400;500;600&display=swap" rel="stylesheet">

    <link rel="stylesheet" href="style.css">

</head>

<body data-game="all">

    <canvas id="embers"></canvas>
    <div class="flash" id="flash"></div>
    <div class="crosshair" id="crosshair"></div>
    <div class="toasts" id="toasts"></div>

    <header class="topbar">

        <div class="brand">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="44" height="44" aria-hidden="true">
          <defs>
            <linearGradient id="steelf" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#e3e6eb"/><stop offset="0.35" stop-color="#7b808a"/>
              <stop offset="0.65" stop-color="#2d3037"/><stop offset="1" stop-color="#a8adb7"/>
            </linearGradient>
            <linearGradient id="flamef" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stop-color="#ff3b14"/><stop offset="0.6" stop-color="#ff7a1a"/><stop offset="1" stop-color="#ffb02e"/>
            </linearGradient>
            <filter id="blurf" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="7"/></filter>
            <filter id="coref" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="9"/></filter>
            <clipPath id="clipf"><polygon points="150.0,21.7 243.0,49.6 272.8,114.7 252.3,202.1 150.0,280.2 47.7,202.1 27.2,114.7 57.0,49.6"/></clipPath>
          </defs>
          
          <polygon points="150.0,12.0 250.0,42.0 282.0,112.0 260.0,206.0 150.0,290.0 40.0,206.0 18.0,112.0 50.0,42.0" fill="#130c0b"/>
          <g clip-path="url(#clipf)">
            <path d="M58.0,244.0 V156.6 Q58.0,112.3 150.0,76.0 Q242.0,112.3 242.0,156.6 V244.0 Z" fill="#1c0a07" stroke="#000000" stroke-width="1.6" stroke-opacity="0.55"/>
            <path d="M70.4,230.0 V154.4 Q70.4,116.1 150.0,84.7 Q229.6,116.1 229.6,154.4 V230.0 Z" fill="#33100a" stroke="#000000" stroke-width="1.6" stroke-opacity="0.55"/>
            <path d="M82.8,216.0 V152.2 Q82.8,119.9 150.0,93.4 Q217.2,119.9 217.2,152.2 V216.0 Z" fill="#5e1609" stroke="#000000" stroke-width="1.6" stroke-opacity="0.55"/>
            <path d="M95.3,202.0 V150.0 Q95.3,123.6 150.0,102.0 Q204.7,123.6 204.7,150.0 V202.0 Z" fill="#9a2410" stroke="#000000" stroke-width="1.6" stroke-opacity="0.55"/>
            <path d="M107.7,188.0 V147.8 Q107.7,127.4 150.0,110.7 Q192.3,127.4 192.3,147.8 V188.0 Z" fill="#ff3b14" stroke="#ffffff" stroke-width="1.6" stroke-opacity="0.55"/>
            <path d="M120.1,174.0 V145.6 Q120.1,131.2 150.0,119.4 Q179.9,131.2 179.9,145.6 V174.0 Z" fill="#ffb02e" stroke="#ffffff" stroke-width="1.6" stroke-opacity="0.55"/>
            <path d="M132.5,160.0 V143.4 Q132.5,135.0 150.0,128.1 Q167.5,135.0 167.5,143.4 V160.0 Z" fill="#fff2cf" stroke="#ffffff" stroke-width="1.6" stroke-opacity="0.55"/>
            <ellipse cx="150" cy="148" rx="30" ry="34" fill="#fff2cf" opacity="0.85" filter="url(#coref)"/>
          </g>
          <polygon points="150.0,12.0 250.0,42.0 282.0,112.0 260.0,206.0 150.0,290.0 40.0,206.0 18.0,112.0 50.0,42.0" fill="none" stroke="url(#steelf)" stroke-width="10" stroke-linejoin="miter"/>
          <polygon points="150.0,25.8 240.0,52.8 268.8,115.8 249.0,200.4 150.0,276.0 51.0,200.4 31.2,115.8 60.0,52.8" fill="none" stroke="#ff3b14" stroke-width="2.5"/>
          
          
          <path d="M156.47,125.85 A25,25 0 0 1 174.15,143.53 M174.15,156.47 A25,25 0 0 1 156.47,174.15 M143.53,174.15 A25,25 0 0 1 125.85,156.47 M125.85,143.53 A25,25 0 0 1 143.53,125.85" fill="none" stroke="#000" stroke-opacity="0.65" stroke-width="8"/>
          <path d="M150,112 V132 M150,168 V188 M112,150 H132 M168,150 H188" fill="none" stroke="#000" stroke-opacity="0.65" stroke-width="8"/>
          <path d="M156.47,125.85 A25,25 0 0 1 174.15,143.53 M174.15,156.47 A25,25 0 0 1 156.47,174.15 M143.53,174.15 A25,25 0 0 1 125.85,156.47 M125.85,143.53 A25,25 0 0 1 143.53,125.85" fill="none" stroke="#f1e6df" stroke-width="3.5"/>
          <path d="M150,112 V132 M150,168 V188 M112,150 H132 M168,150 H188" fill="none" stroke="#f1e6df" stroke-width="3.5"/>
          <circle cx="150" cy="150" r="3.4" fill="#ff3b14" stroke="#fff" stroke-width="1.2"/>
        </svg>
            <span>Frag Hall</span>
        </div>

        <nav class="main-nav" id="mainNav">
            <button data-page="home" data-i18n="navHome"></button>
            <button data-page="news" data-i18n="navNews"></button>
            <button data-page="mods" data-i18n="navMods"></button>
            <button data-page="forum" data-i18n="navForum"></button>
            <button data-page="chat" data-i18n="navChat"></button>
            <button data-page="top" data-i18n="navTop"></button>
        </nav>

        <div class="tools">

            <button class="icon-button" id="soundButton" type="button" data-i18n-title="soundTitle">♪</button>
            <button class="icon-button" id="crosshairButton" type="button" data-i18n-title="crosshairTitle">✛</button>

            <button class="icon-button" id="messageButton" type="button" data-i18n-title="navMessages" hidden>✉<span class="badge-count" id="messageBadge" hidden>0</span></button>

            <div class="bell-wrap">
                <button class="icon-button" id="bellButton" type="button" data-i18n-title="notifications" hidden>🔔<span class="badge-count" id="bellBadge" hidden>0</span></button>
                <div class="notif-panel" id="notifPanel" hidden></div>
            </div>

            <select id="langSelect" aria-label="Language">
                <option value="ro">Română</option>
                <option value="en">English</option>
                <option value="ru">Русский</option>
                <option value="fr">Français</option>
            </select>

            <button class="account-button" id="accountButton" data-page="account"></button>

        </div>

    </header>

    <main>

        <section class="page" id="page-home">

            <div class="hero">
                <h1 id="heroTitle"></h1>
                <p id="heroText"></p>

                <div class="hero-actions">
                    <button class="primary" data-page="news" data-i18n="heroBtnNews"></button>
                    <button class="secondary" data-page="mods" data-i18n="heroBtnMods"></button>
                </div>
            </div>

            <div class="featured" id="featuredBox" hidden></div>

            <div class="stats-row" id="statsRow"></div>

            <h2 data-i18n="latestNews"></h2>
            <div class="news-grid" id="homeNews"></div>

            <h2 data-i18n="trending"></h2>
            <div class="mod-list" id="trendingMods"></div>

            <h2 data-i18n="pollTitle"></h2>
            <div class="panel" id="pollBox"></div>

            <div class="two-columns">

                <div>
                    <h2 data-i18n="topPlayers"></h2>
                    <div id="homeTop"></div>
                </div>

                <div>
                    <h2 data-i18n="recentActivity"></h2>
                    <div id="activityFeed"></div>
                </div>

            </div>

        </section>

        <section class="page" id="page-news">

            <h2 data-i18n="navNews"></h2>

            <div class="panel admin-panel" id="adminPanel">

                <h3 data-i18n="addNews"></h3>

                <form id="newsForm">
                    <select id="newsGame">
                        <option value="all">Frag Hall</option>
                        <option value="doom">Doom</option>
                        <option value="quake">Quake</option>
                        <option value="sam">Serious Sam</option>
                    </select>
                    <input type="text" id="newsTitleInput" data-i18n-placeholder="newsTitleField" maxlength="100">
                    <textarea id="newsBodyInput" rows="3" data-i18n-placeholder="newsBodyField" maxlength="600"></textarea>
                    <input type="text" id="newsUrlInput" data-i18n-placeholder="newsLink" maxlength="300">
                    <button class="primary" type="submit" data-i18n="publish"></button>
                </form>

                <h3 data-i18n="createPoll"></h3>

                <form id="pollForm">
                    <input type="text" id="pollQuestionInput" data-i18n-placeholder="pollQuestion" maxlength="120">
                    <textarea id="pollOptionsInput" rows="4" data-i18n-placeholder="pollOptions"></textarea>
                    <button class="primary" type="submit" data-i18n="publish"></button>
                </form>

            </div>

            <div class="news-grid" id="newsList"></div>

        </section>

        <section class="page" id="page-mods">

            <h2 data-i18n="navMods"></h2>

            <div class="toolbar">
                <input type="search" id="modSearch" data-i18n-placeholder="searchPlaceholder">

                <select id="modSort">
                    <option value="new" data-i18n="sortNew"></option>
                    <option value="popular" data-i18n="sortPopular"></option>
                    <option value="rated" data-i18n="sortRated"></option>
                </select>

                <button class="outline" id="favoritesToggle" type="button" data-i18n="favoritesOnly"></button>
                <button class="outline" id="folderButton" type="button" data-i18n="changeFolder"></button>
            </div>

            <div class="mod-list" id="modList"></div>

            <h3 data-i18n="uploadTitle"></h3>

            <div class="panel" id="uploadPanel">

                <p class="notice" id="uploadNotice" data-i18n="loginNeeded"></p>

                <form id="uploadForm">

                    <select id="uploadGame">
                        <option value="doom">Doom</option>
                        <option value="quake">Quake</option>
                        <option value="sam">Serious Sam</option>
                    </select>

                    <input type="text" id="uploadName" data-i18n-placeholder="uploadName" maxlength="60">
                    <textarea id="uploadDescription" rows="3" data-i18n-placeholder="uploadDescription" maxlength="400"></textarea>
                    <input type="file" id="uploadFile">

                    <label for="uploadImage" data-i18n="uploadCover"></label>
                    <input type="file" id="uploadImage" accept="image/png,image/jpeg,image/webp,image/gif">

                    <label for="uploadGallery" data-i18n="uploadGallery"></label>
                    <input type="file" id="uploadGallery" accept="image/png,image/jpeg,image/webp,image/gif" multiple>

                    <button class="primary" type="submit" data-i18n="uploadBtn"></button>

                </form>

            </div>

        </section>

        <section class="page" id="page-forum">

            <h2 data-i18n="navForum"></h2>

            <div class="toolbar">
                <input type="search" id="forumSearch" data-i18n-placeholder="searchPlaceholder">

                <select id="forumSort">
                    <option value="new" data-i18n="sortNew"></option>
                    <option value="popular" data-i18n="sortPopular"></option>
                    <option value="replies" data-i18n="sortReplies"></option>
                </select>
            </div>

            <div class="panel">

                <p class="notice" id="forumNotice" data-i18n="loginNeeded"></p>

                <form id="threadForm">

                    <select id="threadGame">
                        <option value="doom">Doom</option>
                        <option value="quake">Quake</option>
                        <option value="sam">Serious Sam</option>
                    </select>

                    <input type="text" id="threadTitle" data-i18n-placeholder="threadTitle" maxlength="80">
                    <textarea id="threadBody" rows="3" data-i18n-placeholder="threadBody" maxlength="500"></textarea>

                    <button class="primary" type="submit" data-i18n="post"></button>

                </form>

            </div>

            <div class="thread-list" id="threadList"></div>

        </section>

        <section class="page" id="page-chat">

            <h2 id="chatChannel"></h2>

            <div class="panel chat-panel">

                <div class="chat-log" id="chatLog"></div>

                <p class="notice" id="chatNotice" data-i18n="loginNeeded"></p>

                <form class="chat-form" id="chatForm">
                    <input type="text" id="chatInput" data-i18n-placeholder="chatPlaceholder" maxlength="200" autocomplete="off">
                    <button class="primary" type="submit" data-i18n="send"></button>
                </form>

            </div>

        </section>

        <section class="page" id="page-top">

            <h2 data-i18n="topTitle"></h2>

            <div id="topList"></div>

            <h3 data-i18n="rank"></h3>
            <div class="legend" id="rankLegend"></div>

        </section>

        <section class="page" id="page-messages">

            <h2 data-i18n="messagesTitle"></h2>

            <div class="messages-layout">

                <div class="conversation-list" id="conversationList"></div>

                <div class="panel chat-panel">

                    <h3 id="messageWith"></h3>

                    <div class="chat-log" id="messageLog"></div>

                    <form class="chat-form" id="messageForm">
                        <input type="text" id="messageInput" data-i18n-placeholder="writeMessage" maxlength="500" autocomplete="off">
                        <button class="primary" type="submit" data-i18n="send"></button>
                    </form>

                </div>

            </div>

        </section>

        <section class="page" id="page-profile">
            <div id="profileView"></div>
        </section>

        <section class="page" id="page-account">

            <div class="panel account-panel" id="guestPanel">

                <h2 id="authTitle"></h2>

                <form id="authForm">

                    <input type="text" id="authUser" data-i18n-placeholder="username" maxlength="24" autocomplete="username">
                    <input type="password" id="authPass" data-i18n-placeholder="password" maxlength="64" autocomplete="current-password">

                    <p class="error" id="authError"></p>

                    <button class="primary" type="submit" id="authSubmit"></button>
                    <button class="link-button" type="button" id="authToggle"></button>

                </form>

            </div>

            <div class="panel account-panel" id="userPanel">

                <h2 id="welcomeText"></h2>

                <div class="account-actions">
                    <button class="primary" type="button" id="profileLink" data-i18n="navProfile"></button>
                    <button class="secondary" type="button" id="logoutButton" data-i18n="logout"></button>
                </div>

                <h3 data-i18n="changePassword"></h3>

                <form id="passwordForm">
                    <input type="password" id="oldPassword" data-i18n-placeholder="oldPassword" maxlength="64" autocomplete="current-password">
                    <input type="password" id="newPassword" data-i18n-placeholder="newPassword" maxlength="64" autocomplete="new-password">
                    <button class="primary" type="submit" data-i18n="changePassword"></button>
                </form>

            </div>

        </section>

    </main>

    <div class="modal" id="modal" hidden>
        <div class="modal-box">
            <button class="modal-close" id="modalClose" type="button" data-i18n-title="close">✕</button>
            <div id="modalContent"></div>
        </div>
    </div>

    <footer class="dock" id="gameDock">

        <button data-game="all">
            <svg viewBox="0 0 40 40" aria-hidden="true">
                <rect x="6" y="6" width="12" height="12" />
                <rect x="22" y="6" width="12" height="12" />
                <rect x="6" y="22" width="12" height="12" />
                <rect x="22" y="22" width="12" height="12" />
            </svg>
            <span data-i18n="gameAll"></span>
        </button>

        <button data-game="doom">
            <svg viewBox="0 0 40 40" aria-hidden="true">
                <path d="M20 4 C10 4 6 12 8 20 C9 24 11 26 12 29 L12 35 L17 33 L18 36 L22 36 L23 33 L28 35 L28 29 C29 26 31 24 32 20 C34 12 30 4 20 4 Z" />
                <circle cx="14" cy="19" r="3.5" class="cut" />
                <circle cx="26" cy="19" r="3.5" class="cut" />
            </svg>
            <span>Doom</span>
        </button>

        <button data-game="quake">
            <svg viewBox="0 0 40 40" aria-hidden="true">
                <circle cx="20" cy="20" r="15" />
                <path d="M13 12 L27 12 L27 25 L23 25 L23 29 L19 29 L19 25 L13 25 Z" class="cut" />
            </svg>
            <span>Quake</span>
        </button>

        <button data-game="sam">
            <svg viewBox="0 0 40 40" aria-hidden="true">
                <circle cx="20" cy="22" r="12" />
                <rect x="18" y="5" width="4" height="8" />
                <path d="M26 8 L32 4 L33 8 L28 11 Z" />
                <circle cx="20" cy="22" r="5" class="cut" />
            </svg>
            <span>Serious Sam</span>
        </button>

    </footer>

    <script src="translations.js"></script>
    <script src="script.js"></script>

</body>

</html>
`,

    css: String.raw`:root {
    --accent: #e8452c;
    --accent-2: #f2a65a;
    --bg: #130c0b;
    --panel: #201513;
    --line: #3a2724;
    --text: #f1e6df;
    --muted: #a8948c;
    --cut: 14px;
}

body[data-game="doom"] {
    --accent: #ff3b14;
    --accent-2: #ffb02e;
    --bg: #160807;
    --panel: #251210;
    --line: #4a1f1a;
}

body[data-game="quake"] {
    --accent: #c9923f;
    --accent-2: #8fb0c4;
    --bg: #12110d;
    --panel: #1f1d17;
    --line: #3d3828;
}

body[data-game="sam"] {
    --accent: #2fb7ff;
    --accent-2: #ffd23f;
    --bg: #07131d;
    --panel: #0f2132;
    --line: #1d3d57;
}

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

html {
    scroll-behavior: smooth;
}

body {
    background: var(--bg);
    color: var(--text);
    font-family: "Barlow", sans-serif;
    font-size: 17px;
    line-height: 1.55;
    min-height: 100vh;
    transition: background 0.6s ease;
}

#embers {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 0;
}

button,
select,
input,
textarea {
    font: inherit;
    color: inherit;
}

button {
    cursor: pointer;
}

button:focus-visible,
select:focus-visible,
input:focus-visible,
textarea:focus-visible,
a:focus-visible {
    outline: 3px solid var(--accent-2);
    outline-offset: 2px;
}

.topbar {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 28px;
    background: rgba(10, 6, 6, 0.88);
    backdrop-filter: blur(8px);
    border-bottom: 2px solid var(--accent);
}

.brand {
    font-family: "Teko", sans-serif;
    font-size: 2.2rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: var(--accent);
    text-shadow: 0 0 18px var(--accent);
}

.main-nav {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
}

.main-nav button {
    background: none;
    border: none;
    padding: 6px 16px;
    font-family: "Teko", sans-serif;
    font-size: 1.4rem;
    letter-spacing: 0.04em;
    color: var(--muted);
    border-bottom: 3px solid transparent;
    transition: color 0.2s, border-color 0.2s;
}

.main-nav button:hover,
.main-nav button.active {
    color: var(--text);
    border-bottom-color: var(--accent);
}

.tools {
    display: flex;
    gap: 10px;
    align-items: center;
}

.tools select,
.account-button {
    background: var(--panel);
    border: 1px solid var(--line);
    padding: 7px 14px;
}

.account-button {
    background: var(--accent);
    border-color: var(--accent);
    color: #120806;
    font-weight: 600;
}

main {
    position: relative;
    z-index: 1;
    max-width: 1100px;
    margin: 0 auto;
    padding: 36px 24px 150px;
}

.page {
    display: none;
}

.page.active {
    display: block;
    animation: pageIn 0.45s ease;
}

@keyframes pageIn {
    from {
        opacity: 0;
        transform: translateY(14px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

h2,
h3 {
    font-family: "Teko", sans-serif;
    font-weight: 700;
    letter-spacing: 0.03em;
    margin: 34px 0 16px;
}

h2 {
    font-size: 2.6rem;
}

h3 {
    font-size: 2rem;
}

.hero {
    padding: 70px 0 50px;
}

.hero h1 {
    font-family: "Teko", sans-serif;
    font-size: clamp(4rem, 14vw, 10rem);
    line-height: 0.9;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--text);
    text-shadow: 6px 6px 0 var(--accent), 0 0 60px var(--accent);
}

.hero h1.slam {
    animation: slam 0.55s cubic-bezier(0.2, 1.4, 0.4, 1);
}

@keyframes slam {
    0% {
        transform: scale(1.35);
        opacity: 0;
        filter: blur(6px);
    }

    100% {
        transform: scale(1);
        opacity: 1;
        filter: blur(0);
    }
}

.hero p {
    max-width: 620px;
    margin: 22px 0 28px;
    font-size: 1.25rem;
    color: var(--muted);
}

.hero-actions {
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
}

.primary,
.secondary {
    padding: 11px 26px;
    font-family: "Teko", sans-serif;
    font-size: 1.35rem;
    letter-spacing: 0.05em;
    border: 2px solid var(--accent);
    clip-path: polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%);
    transition: transform 0.15s, background 0.2s;
}

.primary {
    background: var(--accent);
    color: #120806;
}

.secondary {
    background: transparent;
    color: var(--text);
}

.primary:hover,
.secondary:hover {
    transform: translateY(-3px);
}

.secondary:hover {
    background: var(--accent);
    color: #120806;
}

.news-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
}

.news-card {
    background: var(--panel);
    padding: 22px 24px;
    border-left: 6px solid var(--accent);
    clip-path: polygon(0 0, calc(100% - var(--cut)) 0, 100% var(--cut), 100% 100%, 0 100%);
    transition: transform 0.25s, border-color 0.25s;
}

.news-card:hover {
    transform: translateX(6px);
    border-left-color: var(--accent-2);
}

.news-card .meta {
    color: var(--accent-2);
    font-size: 0.9rem;
    font-weight: 600;
}

.news-card h4 {
    font-family: "Teko", sans-serif;
    font-size: 1.7rem;
    line-height: 1.1;
    margin: 6px 0 8px;
}

.news-card p {
    color: var(--muted);
    margin-bottom: 12px;
}

.news-card a {
    color: var(--accent);
    font-weight: 600;
}

.panel {
    background: var(--panel);
    border: 1px solid var(--line);
    padding: 24px;
    clip-path: polygon(0 0, 100% 0, 100% calc(100% - var(--cut)), calc(100% - var(--cut)) 100%, 0 100%);
}

.panel form {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 560px;
}

input,
textarea,
select {
    background: #0c0807;
    border: 1px solid var(--line);
    padding: 10px 14px;
    width: 100%;
}

.notice {
    color: var(--accent-2);
    margin-bottom: 14px;
}

.error {
    color: #ff6b6b;
    min-height: 1.4em;
}

.link-button {
    background: none;
    border: none;
    color: var(--accent-2);
    text-decoration: underline;
    align-self: flex-start;
}

.account-panel {
    max-width: 480px;
    margin: 40px auto;
}

.account-panel h2 {
    margin-top: 0;
}

.mod-list,
.thread-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin-bottom: 20px;
}

.mod-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    background: var(--panel);
    padding: 16px 22px;
    border-left: 6px solid var(--accent);
}

.mod-row strong {
    font-family: "Teko", sans-serif;
    font-size: 1.6rem;
}

.mod-row small {
    display: block;
    color: var(--muted);
}

.mod-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.mod-actions button,
.mod-actions a {
    background: var(--accent);
    color: #120806;
    border: none;
    padding: 7px 18px;
    font-weight: 600;
    text-decoration: none;
}

.mod-actions .installed {
    background: transparent;
    color: var(--accent-2);
    border: 2px solid var(--accent-2);
}

.thread {
    background: var(--panel);
    padding: 20px 24px;
    border-left: 6px solid var(--accent-2);
}

.thread h4 {
    font-family: "Teko", sans-serif;
    font-size: 1.7rem;
}

.thread .meta {
    color: var(--muted);
    font-size: 0.9rem;
    margin-bottom: 8px;
}

.reply {
    margin: 10px 0 0 16px;
    padding-left: 14px;
    border-left: 2px solid var(--line);
    color: var(--muted);
}

.reply b {
    color: var(--text);
}

.reply-form {
    display: flex;
    gap: 10px;
    margin-top: 14px;
}

.reply-form button {
    background: var(--accent);
    border: none;
    padding: 0 20px;
    color: #120806;
    font-weight: 600;
}

.dock {
    position: fixed;
    left: 50%;
    bottom: 16px;
    transform: translateX(-50%);
    z-index: 30;
    display: flex;
    gap: 10px;
    padding: 10px;
    background: rgba(10, 6, 6, 0.92);
    border: 2px solid var(--accent);
    clip-path: polygon(14px 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 14px 100%, 0 50%);
    max-width: 96vw;
}

.dock button {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    min-width: 86px;
    padding: 8px 12px;
    background: transparent;
    border: 1px solid transparent;
    font-family: "Teko", sans-serif;
    font-size: 1.1rem;
    color: var(--muted);
    transition: transform 0.2s, color 0.2s, background 0.2s;
}

.dock svg {
    width: 38px;
    height: 38px;
    fill: currentColor;
}

.dock svg .cut {
    fill: #0a0606;
}

.dock button:hover {
    transform: translateY(-6px);
    color: var(--text);
}

.dock button.active {
    color: var(--accent);
    background: rgba(255, 255, 255, 0.05);
    border-color: var(--accent);
}

@media (max-width: 700px) {

    .topbar {
        padding: 10px 14px;
    }

    .dock button {
        min-width: 64px;
        padding: 6px 6px;
        font-size: 0.95rem;
    }

    .dock svg {
        width: 28px;
        height: 28px;
    }

    .hero {
        padding-top: 30px;
    }
}

@media (prefers-reduced-motion: reduce) {

    *,
    *::before,
    *::after {
        animation: none !important;
        transition: none !important;
    }
}

#folderButton {
    margin-bottom: 20px;
}

.empty {
    color: var(--muted);
    padding: 20px 0;
}

.mod-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
    gap: 22px;
}

.mod-card {
    background: var(--panel);
    border: 1px solid var(--line);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    clip-path: polygon(0 0, calc(100% - var(--cut)) 0, 100% var(--cut), 100% 100%, 0 100%);
    transition: transform 0.25s, border-color 0.25s;
}

.mod-card:hover {
    transform: translateY(-6px);
    border-color: var(--accent);
}

.mod-picture {
    position: relative;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    background: #0c0807;
}

.mod-picture img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.5s ease;
}

.mod-card:hover .mod-picture img {
    transform: scale(1.08);
}

.mod-tag {
    position: absolute;
    left: 0;
    top: 12px;
    padding: 3px 14px 3px 10px;
    background: var(--accent);
    color: #120806;
    font-family: "Teko", sans-serif;
    font-size: 1.1rem;
    letter-spacing: 0.05em;
    clip-path: polygon(0 0, 100% 0, calc(100% - 8px) 100%, 0 100%);
}

.mod-body {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 16px 18px 18px;
    flex: 1;
}

.mod-body strong {
    font-family: "Teko", sans-serif;
    font-size: 1.7rem;
    line-height: 1.05;
}

.mod-body small {
    color: var(--muted);
}

.mod-body .mod-actions {
    margin-top: auto;
    padding-top: 10px;
}

form label {
    color: var(--muted);
    font-size: 0.95rem;
}

body::before {
    content: "";
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    background: radial-gradient(520px circle at var(--mx, 50%) var(--my, 30%), color-mix(in srgb, var(--accent) 16%, transparent), transparent 70%);
}

.muted {
    color: var(--muted);
}

.small {
    padding: 4px 12px;
    font-size: 0.9rem;
}

button.small,
button.danger,
button.outline {
    border: 2px solid var(--accent);
    background: transparent;
    color: var(--text);
    padding: 6px 16px;
    font-weight: 600;
    transition: background 0.2s, color 0.2s;
}

button.small {
    padding: 3px 12px;
    font-size: 0.9rem;
}

button.danger {
    border-color: #ff5d5d;
    color: #ff8a8a;
}

button.danger:hover {
    background: #ff5d5d;
    color: #120806;
}

button.outline:hover,
button.outline.on,
button.small:hover {
    background: var(--accent);
    color: #120806;
}

.mod-actions button.outline {
    background: transparent;
    color: var(--text);
    border: 2px solid var(--accent);
}

.mod-actions button.danger {
    background: transparent;
    color: #ff8a8a;
    border: 2px solid #ff5d5d;
}

.hero h1 {
    position: relative;
}

.hero h1::before {
    content: attr(data-text);
    position: absolute;
    inset: 0;
    color: var(--accent-2);
    text-shadow: none;
    clip-path: inset(0 0 100% 0);
    animation: glitch 6s infinite;
}

@keyframes glitch {

    0%,
    91%,
    100% {
        clip-path: inset(0 0 100% 0);
        transform: translate(0);
    }

    92% {
        clip-path: inset(12% 0 58% 0);
        transform: translate(-7px, 0);
    }

    94% {
        clip-path: inset(58% 0 18% 0);
        transform: translate(7px, 0);
    }

    96% {
        clip-path: inset(32% 0 40% 0);
        transform: translate(-3px, 0);
    }
}

.flash {
    position: fixed;
    inset: 0;
    z-index: 90;
    pointer-events: none;
    background: var(--accent);
    opacity: 0;
}

.flash.go {
    animation: flash 0.45s ease-out;
}

@keyframes flash {
    0% {
        opacity: 0.5;
    }

    100% {
        opacity: 0;
    }
}

.crosshair {
    display: none;
    position: fixed;
    left: 0;
    top: 0;
    width: 0;
    height: 0;
    z-index: 300;
    pointer-events: none;
}

body.crosshair-on .crosshair {
    display: block;
}

body.crosshair-on,
body.crosshair-on * {
    cursor: none !important;
}

.crosshair::before,
.crosshair::after {
    content: "";
    position: absolute;
    background: var(--accent-2);
    box-shadow: 0 0 6px #000;
}

.crosshair::before {
    left: -14px;
    top: -1px;
    width: 28px;
    height: 2px;
}

.crosshair::after {
    left: -1px;
    top: -14px;
    width: 2px;
    height: 28px;
}

.crosshair.shot {
    animation: shot 0.25s ease-out;
}

@keyframes shot {
    0% {
        filter: drop-shadow(0 0 12px var(--accent));
        scale: 1.6;
    }

    100% {
        filter: none;
        scale: 1;
    }
}

.toasts {
    position: fixed;
    right: 18px;
    top: 80px;
    z-index: 250;
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-width: min(360px, 90vw);
}

.toast {
    background: var(--panel);
    border-left: 6px solid var(--accent-2);
    padding: 12px 16px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
    animation: toastIn 0.3s ease-out;
}

.toast.error {
    border-left-color: #ff5d5d;
}

.toast.success {
    border-left-color: #5dd28a;
}

.toast.leaving {
    opacity: 0;
    transform: translateX(30px);
    transition: opacity 0.4s, transform 0.4s;
}

@keyframes toastIn {
    from {
        opacity: 0;
        transform: translateX(40px);
    }

    to {
        opacity: 1;
        transform: translateX(0);
    }
}

.icon-button {
    position: relative;
    background: var(--panel);
    border: 1px solid var(--line);
    padding: 6px 12px;
    font-size: 1.1rem;
    color: var(--muted);
}

.icon-button.on {
    color: var(--accent-2);
    border-color: var(--accent-2);
}

.bell-wrap {
    position: relative;
}

.badge-count {
    position: absolute;
    right: -6px;
    top: -8px;
    min-width: 20px;
    padding: 0 5px;
    border-radius: 10px;
    background: var(--accent);
    color: #120806;
    font-size: 0.75rem;
    font-weight: 700;
}

.notif-panel {
    position: absolute;
    right: 0;
    top: 46px;
    z-index: 60;
    width: min(340px, 90vw);
    max-height: 60vh;
    overflow-y: auto;
    background: var(--panel);
    border: 2px solid var(--accent);
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.notif-panel[hidden] {
    display: none;
}

.notif-row {
    display: flex;
    flex-direction: column;
    gap: 2px;
    text-align: left;
    background: transparent;
    border: none;
    border-left: 3px solid var(--line);
    padding: 6px 10px;
    color: var(--text);
}

.notif-row.unread {
    border-left-color: var(--accent);
    background: rgba(255, 255, 255, 0.04);
}

.account-button {
    display: flex;
    align-items: center;
    gap: 8px;
}

.avatar {
    --size: 36px;
    --hue: 10;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: var(--size);
    height: var(--size);
    border-radius: 50%;
    overflow: hidden;
    background: hsl(var(--hue), 55%, 32%);
    color: #fff;
    font-weight: 700;
    font-size: calc(var(--size) * 0.45);
    border: 2px solid var(--accent);
}

.avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.user-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: none;
    border: none;
    color: var(--text);
    font-weight: 600;
    padding: 2px 0;
}

.user-link:hover span:last-child {
    color: var(--accent);
    text-decoration: underline;
}

.stats-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 14px;
    margin: 10px 0 20px;
}

.stat {
    background: var(--panel);
    border-bottom: 4px solid var(--accent);
    padding: 16px 18px;
    text-align: center;
}

.stat strong {
    display: block;
    font-family: "Teko", sans-serif;
    font-size: 2.8rem;
    line-height: 1;
    color: var(--accent);
}

.stat span {
    color: var(--muted);
}

.small-stats .stat strong {
    font-size: 2.2rem;
}

.two-columns {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 30px;
}

.toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 20px;
}

.toolbar input,
.toolbar select {
    width: auto;
    flex: 1 1 200px;
}

.reveal {
    animation: cardIn 0.5s ease both;
    animation-delay: calc(var(--i, 0) * 60ms);
}

@keyframes cardIn {
    from {
        opacity: 0;
        transform: translateY(24px) scale(0.97);
    }

    to {
        opacity: 1;
        transform: none;
    }
}

.tilt {
    transform: perspective(800px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
    transition: transform 0.15s ease-out, border-color 0.25s;
}

.tilt:hover {
    transform: perspective(800px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) translateY(-6px);
}

.card-footer {
    display: flex;
    align-items: center;
    gap: 14px;
}

.heart {
    position: absolute;
    right: 10px;
    top: 10px;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    border: none;
    background: rgba(10, 6, 6, 0.75);
    color: var(--text);
    font-size: 1.3rem;
    transition: transform 0.15s;
}

.heart:hover {
    transform: scale(1.15);
}

.heart.on {
    color: #ff5d7a;
}

.mod-picture {
    cursor: pointer;
}

.mod-title {
    cursor: pointer;
}

.mod-title:hover {
    color: var(--accent);
}

.rating-line {
    color: var(--accent-2);
    font-size: 0.95rem;
    letter-spacing: 0.04em;
}

.stars {
    display: inline-flex;
}

.star {
    background: none;
    border: none;
    font-size: 1.9rem;
    color: var(--line);
    padding: 0 2px;
    transition: transform 0.15s, color 0.15s;
}

.star.on {
    color: var(--accent-2);
}

.star:hover {
    transform: scale(1.25);
    color: var(--accent);
}

.rating-box {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
    margin: 10px 0 16px;
}

.poll-question {
    font-family: "Teko", sans-serif;
    font-size: 1.9rem;
    margin-bottom: 12px;
}

.poll-row {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    margin-bottom: 8px;
    background: #0c0807;
    overflow: hidden;
}

.poll-bar {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: var(--percent);
    background: color-mix(in srgb, var(--accent) 35%, transparent);
    transition: width 0.8s ease;
}

.poll-row.mine {
    outline: 2px solid var(--accent-2);
}

.poll-text {
    position: relative;
    flex: 1;
}

.poll-count {
    position: relative;
    color: var(--muted);
}

.poll-row button {
    position: relative;
}

.activity-row,
.leader-row {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    background: var(--panel);
    border-left: 4px solid var(--accent);
    padding: 10px 14px;
    margin-bottom: 8px;
}

.activity-text {
    flex: 1;
}

.link-button {
    font: inherit;
    cursor: pointer;
}

.leader-position {
    font-family: "Teko", sans-serif;
    font-size: 1.6rem;
    color: var(--muted);
    min-width: 40px;
}

.leader-points {
    margin-left: auto;
    color: var(--accent-2);
}

.rank-tag {
    display: inline-block;
    padding: 2px 12px;
    font-family: "Teko", sans-serif;
    font-size: 1.1rem;
    letter-spacing: 0.04em;
    background: #3a3a3a;
    color: #fff;
    clip-path: polygon(0 0, 100% 0, calc(100% - 8px) 100%, 0 100%);
}

.rank-1 {
    background: #7a4a22;
}

.rank-2 {
    background: #8a2a6a;
}

.rank-3 {
    background: #a8321f;
}

.rank-4 {
    background: #1f6a8a;
}

.rank-5 {
    background: #d6a21f;
    color: #120806;
}

.legend {
    display: flex;
    flex-wrap: wrap;
    gap: 18px;
}

.legend-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.thread-head,
.reply-top {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
}

.thread-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin: 8px 0;
}

.thread.pinned {
    border-left-color: var(--accent);
    box-shadow: 0 0 0 1px var(--accent) inset;
}

.badge {
    display: inline-block;
    padding: 1px 10px;
    background: var(--accent);
    color: #120806;
    font-size: 0.8rem;
    font-weight: 700;
}

.like-button {
    background: transparent;
    border: 1px solid var(--line);
    color: var(--muted);
    padding: 2px 12px;
    transition: color 0.2s, border-color 0.2s;
}

.like-button.liked,
.like-button:hover {
    color: #ff5d7a;
    border-color: #ff5d7a;
}

.reply p {
    margin: 4px 0;
}

.chat-panel {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.chat-log {
    height: 50vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-right: 6px;
}

.chat-row {
    display: flex;
    align-items: baseline;
    gap: 10px;
    flex-wrap: wrap;
}

.chat-text {
    flex: 1;
    word-break: break-word;
}

.chat-form {
    display: flex;
    gap: 10px;
    max-width: none;
}

.panel .chat-form {
    max-width: none;
    flex-direction: row;
}

.profile-header {
    display: flex;
    gap: 24px;
    align-items: center;
    flex-wrap: wrap;
}

.profile-info {
    flex: 1;
    min-width: 240px;
}

.profile-info h2 {
    margin: 0 0 6px;
}

.profile-tags {
    display: flex;
    gap: 10px;
    align-items: center;
    margin-bottom: 8px;
}

.progress {
    height: 10px;
    margin: 10px 0 6px;
    background: #0c0807;
}

.progress::after {
    content: "";
    display: block;
    height: 100%;
    width: var(--percent);
    background: linear-gradient(90deg, var(--accent), var(--accent-2));
}

.bio-form {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 14px;
    max-width: 600px;
}

.admin-panel {
    margin-bottom: 26px;
}

.admin-panel h3:first-child {
    margin-top: 0;
}

.account-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
}

.modal {
    position: fixed;
    inset: 0;
    z-index: 120;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 5vh 16px;
    background: rgba(5, 3, 3, 0.82);
    backdrop-filter: blur(6px);
    overflow-y: auto;
    animation: pageIn 0.25s ease;
}

.modal[hidden] {
    display: none;
}

.modal-box {
    position: relative;
    width: min(760px, 100%);
    background: var(--panel);
    border: 2px solid var(--accent);
}

.modal-close {
    position: absolute;
    right: 12px;
    top: 12px;
    z-index: 2;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none;
    background: rgba(10, 6, 6, 0.8);
    color: var(--text);
    font-size: 1.1rem;
}

.modal-picture {
    position: relative;
    aspect-ratio: 16 / 9;
    background: #0c0807;
}

.modal-picture img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.modal-body {
    padding: 22px 26px 28px;
}

.modal-body h2 {
    margin: 0 0 8px;
}

.modal-meta {
    display: flex;
    gap: 14px;
    align-items: center;
    flex-wrap: wrap;
}

.modal-description {
    margin: 14px 0;
    white-space: pre-wrap;
}

.comment {
    border-left: 3px solid var(--line);
    padding-left: 12px;
    margin-bottom: 12px;
}

.comment p {
    margin: 2px 0 0;
}

body.modal-open {
    overflow: hidden;
}

@media (max-width: 700px) {

    .main-nav button {
        padding: 4px 8px;
        font-size: 1.15rem;
    }

    .tools {
        flex-wrap: wrap;
    }

    .toasts {
        top: 120px;
    }
}

.account-button {
    white-space: nowrap;
    flex: none;
}

.tools select {
    width: auto;
}

.toolbar {
    align-items: center;
}

.toolbar button {
    flex: none;
    min-height: 46px;
}

.toolbar input,
.toolbar select {
    min-height: 46px;
}

.featured {
    display: grid;
    grid-template-columns: minmax(240px, 1fr) minmax(260px, 1fr);
    gap: 0;
    margin: 0 0 24px;
    background: var(--panel);
    border: 2px solid var(--accent);
    clip-path: polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%);
    animation: pageIn 0.6s ease;
}

.featured[hidden] {
    display: none;
}

.featured-picture {
    min-height: 220px;
    background: #0c0807;
}

.featured-picture img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.featured-info {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding: 22px 26px;
}

.featured-info h3 {
    margin: 4px 0 0;
    font-size: 2.6rem;
    line-height: 1;
}

.featured-info p {
    color: var(--muted);
}

.badge.banned {
    background: #ff5d5d;
}

.badge-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin: 0 0 20px;
}

.achievement {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 14px;
    background: var(--panel);
    border: 1px solid var(--accent-2);
    animation: cardIn 0.5s ease both;
}

.achievement-icon {
    font-size: 1.3rem;
}

.messages-layout {
    display: grid;
    grid-template-columns: minmax(220px, 300px) 1fr;
    gap: 20px;
}

.conversation-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.conversation {
    display: flex;
    align-items: center;
    gap: 10px;
    text-align: left;
    background: var(--panel);
    border: 1px solid var(--line);
    border-left: 4px solid var(--line);
    padding: 10px 12px;
    color: var(--text);
}

.conversation.active,
.conversation:hover {
    border-left-color: var(--accent);
}

.conversation-text {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
}

.conversation-text small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.badge-count.inline {
    position: static;
}

.bubble {
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-width: 80%;
    padding: 8px 14px;
    word-break: break-word;
}

.bubble.mine {
    align-self: flex-end;
    background: color-mix(in srgb, var(--accent) 35%, var(--panel));
}

.bubble.theirs {
    align-self: flex-start;
    background: #0c0807;
}

.gallery-strip {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 10px 26px 0;
}

.thumb {
    position: relative;
    width: 96px;
    height: 56px;
    background: #0c0807;
    border: 2px solid var(--line);
    overflow: hidden;
    cursor: pointer;
}

.thumb:hover {
    border-color: var(--accent);
}

.thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.thumb-delete {
    position: absolute;
    right: 2px;
    top: 2px;
    width: 22px;
    height: 22px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: rgba(10, 6, 6, 0.85);
    color: #ff8a8a;
    font-size: 0.75rem;
}

.thumb.add {
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    font-size: 0.75rem;
    color: var(--muted);
}

.thumb.add input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
}

body.bfg {
    animation: shake 0.5s linear 3;
}

body.bfg::after {
    content: "";
    position: fixed;
    inset: 0;
    z-index: 400;
    pointer-events: none;
    background: radial-gradient(circle, rgba(120, 255, 120, 0.7), rgba(40, 200, 60, 0.2) 60%, transparent);
    animation: flash 1.5s ease-out forwards;
}

@keyframes shake {

    0%,
    100% {
        transform: translate(0, 0);
    }

    20% {
        transform: translate(-10px, 6px);
    }

    40% {
        transform: translate(9px, -7px);
    }

    60% {
        transform: translate(-6px, -8px);
    }

    80% {
        transform: translate(8px, 5px);
    }
}

@media (max-width: 760px) {

    .featured,
    .messages-layout {
        grid-template-columns: 1fr;
    }
}

.brand {
    display: flex;
    align-items: center;
    gap: 10px;
}

.brand svg {
    width: 44px;
    height: 44px;
    flex: none;
    filter: drop-shadow(0 0 8px rgba(255, 59, 20, 0.45));
}
`,

    translations: String.raw`const translations = {

    ro: {
        navHome: "Acasă",
        navNews: "Știri",
        navMods: "Moduri",
        navForum: "Forum",
        login: "Intră în cont",
        register: "Creează cont",
        logout: "Ieși din cont",
        username: "Nume de utilizator",
        password: "Parolă",
        haveAccount: "Ai deja cont? Intră",
        noAccount: "Nu ai cont? Creează unul",
        welcome: "Salut, ",
        heroBtnNews: "Vezi știrile",
        heroBtnMods: "Descoperă moduri",
        latestNews: "Ultimele știri",
        source: "Sursa",
        install: "Instalează",
        installed: "Instalat",
        uninstall: "Șterge",
        download: "Descarcă fișierul",
        uploadTitle: "Adaugă un mod",
        uploadName: "Numele modului",
        uploadBtn: "Încarcă modul",
        loginNeeded: "Trebuie să intri în cont pentru această acțiune.",
        threadTitle: "Titlul discuției",
        threadBody: "Mesajul tău",
        post: "Publică",
        reply: "Răspunde",
        replyPlaceholder: "Scrie un răspuns",
        fileTooBig: "Fișierul este prea mare (maxim 100 MB).",
        wrongLogin: "Nume sau parolă greșită.",
        userExists: "Numele este deja folosit.",
        fillAll: "Completează toate câmpurile.",
        saveFailed: "Nu s-a putut salva. Memoria browserului este plină.",
        noItems: "Încă nu e nimic aici. Fii primul.",
        uploadCover: "Imagine pentru mod (opțional)",
        imageInvalid: "Imaginea trebuie să fie PNG, JPG, WEBP sau GIF, maxim 3 MB.",
        serverError: "Serverul nu răspunde. Pornește-l cu «node frag-hall.js» și deschide http://localhost:3000.",
        installedFolder: "Modul a fost pus în folderul ales.",
        installedDownload: "Modul a fost descărcat în Downloads. Mută-l în folderul jocului.",
        changeFolder: "Alege folderul jocului",
        badName: "Numele trebuie să aibă 3-24 de litere, cifre, _ sau -.",
        weakPassword: "Parola trebuie să aibă cel puțin 6 caractere.",
        navChat: "Chat",
        navTop: "Top",
        navProfile: "Profilul meu",
        statUsers: "Utilizatori",
        statMods: "Moduri",
        statThreads: "Discuții",
        statDownloads: "Descărcări",
        statOnline: "Online acum",
        trending: "Moduri în vogă",
        recentActivity: "Activitate recentă",
        topPlayers: "Cei mai activi",
        pollTitle: "Sondajul comunității",
        vote: "Votează",
        votes: "voturi",
        noPoll: "Nu este niciun sondaj activ.",
        activityMod: "a încărcat modul",
        activityThread: "a deschis discuția",
        searchPlaceholder: "Caută...",
        sortNew: "Cele mai noi",
        sortPopular: "Cele mai populare",
        sortRated: "Cele mai bine cotate",
        sortReplies: "Cele mai comentate",
        favoritesOnly: "Doar favoritele",
        uploadDescription: "Descrierea modului (opțional)",
        downloads: "descărcări",
        yourRating: "Nota ta",
        comments: "Comentarii",
        writeComment: "Scrie un comentariu",
        send: "Trimite",
        delete: "Șterge",
        favorite: "Adaugă la favorite",
        unfavorite: "Scoate din favorite",
        confirmDelete: "Sigur vrei să ștergi? Nu se mai poate recupera.",
        pin: "Fixează",
        unpin: "Desprinde",
        pinned: "Fixat",
        repliesLabel: "răspunsuri",
        likesLabel: "Aprecieri",
        chatTitle: "Chat în direct",
        chatPlaceholder: "Scrie un mesaj",
        topTitle: "Clasament",
        points: "puncte",
        rank: "Grade",
        bio: "Despre mine",
        bioPlaceholder: "Scrie câteva cuvinte despre tine",
        saveBio: "Salvează",
        changeAvatar: "Schimbă poza de profil",
        memberSince: "Membru din",
        profileSaved: "Profil salvat.",
        changePassword: "Schimbă parola",
        oldPassword: "Parola veche",
        newPassword: "Parola nouă",
        passwordChanged: "Parola a fost schimbată.",
        admin: "Administrator",
        addNews: "Adaugă o știre",
        newsTitleField: "Titlul știrii",
        newsBodyField: "Textul știrii",
        newsLink: "Link spre sursă (opțional)",
        publish: "Publică",
        createPoll: "Creează un sondaj nou",
        pollQuestion: "Întrebarea",
        pollOptions: "Variante, câte una pe rând",
        notifications: "Notificări",
        noNotifications: "Nicio notificare.",
        notifReply: "a răspuns la discuția",
        notifComment: "a comentat modul",
        soundTitle: "Sunete",
        crosshairTitle: "Țintă pe ecran",
        forbidden: "Nu ai voie să faci asta.",
        rateLimited: "Prea multe cereri. Încearcă peste puțin timp.",
        notFound: "Nu am găsit ce cauți.",
        close: "Închide",
        modUploaded: "Modul a fost încărcat.",
        navMessages: "Mesaje",
        messagesTitle: "Mesaje private",
        noConversations: "Nu ai nicio conversație încă.",
        writeMessage: "Scrie un mesaj privat",
        messageUser: "Trimite mesaj",
        selectConversation: "Alege o conversație",
        newMessages: "Mesaje noi",
        ban: "Blochează",
        unban: "Deblochează",
        banned: "Blocat",
        bannedMsg: "Contul tău este blocat și nu poate scrie.",
        feature: "Modul săptămânii",
        unfeature: "Scoate din Modul săptămânii",
        featuredTitle: "Modul săptămânii",
        openMod: "Vezi modul",
        addScreenshot: "Adaugă captură",
        uploadGallery: "Capturi de ecran (până la 4, opțional)",
        konami: "BFG 9000 activat!",
        badge_talker: "Vorbăreț",
        badgeDesc_talker: "A deschis prima discuție",
        badge_chatterbox: "Palavragiu",
        badgeDesc_chatterbox: "10 răspunsuri pe forum",
        badge_modder: "Modder",
        badgeDesc_modder: "A încărcat un mod",
        badge_prolific: "Fabrică de moduri",
        badgeDesc_prolific: "5 moduri încărcate",
        badge_popular: "Popular",
        badgeDesc_popular: "50 de descărcări la modurile tale",
        badge_loved: "Îndrăgit",
        badgeDesc_loved: "10 aprecieri primite",
        badge_veteran: "Veteran",
        badgeDesc_veteran: "Membru de peste 30 de zile",
        badge_slayer: "Slayer",
        badgeDesc_slayer: "Peste 150 de puncte",
        badge_admin: "Administrator",
        badgeDesc_admin: "Conduce site-ul",
        author: "de",
        community: "comunitate",
        gameAll: "Toate",
        heroTitleAll: "Frag Hall",
        heroTitleDoom: "Doom",
        heroTitleQuake: "Quake",
        heroTitleSam: "Serious Sam",
        heroTextAll: "Știri, moduri și discuții despre Doom, Quake și Serious Sam, într-un singur loc.",
        heroTextDoom: "Slayer-ul continuă. Știri, moduri și discuții despre Doom.",
        heroTextQuake: "30 de ani de Quake. Urmărește episodul nou și comunitatea de modding.",
        heroTextSam: "Hoarde fără sfârșit. Tot ce se întâmplă acum cu Serious Sam.",
        n1t: "Quake primește un episod nou: Dawn of the Machine",
        n1d: "Pentru cei 30 de ani de Quake, MachineGames și id Software au lansat gratuit un episod nou, disponibil pe PC și console.",
        n2t: "Serious Sam: Shatterverse a apărut",
        n2d: "Un shooter roguelite multiplayer din seria Serious Sam a fost lansat pe 31 august 2026 pe PC, PlayStation 5 și Xbox Series X|S.",
        n3t: "Quake Champions nu va mai primi conținut nou",
        n3d: "Pe 23 septembrie 2026, Bethesda a anunțat că jocul nu va mai primi actualizări de conținut.",
        n4t: "Doom ajunge în World of Tanks",
        n4d: "Battle Pass Special: Doom rulează în World of Tanks între 1 și 11 octombrie, cu un tanc inspirat de BFG.",
        n5t: "Doom Collection vine pe Evercade",
        n5d: "Cartușul Doom Collection și consola Evercade Nexus Doom Edition apar în octombrie 2026.",
        n6t: "Doom: The Dark Ages primește un hotfix",
        n6d: "Revelations Update 4 Hotfix 2 repară mai multe erori și câteva crash-uri.",
        t1t: "Care este cel mai bun mod pentru Doom?",
        t1b: "Caut ceva care schimbă armele și inamicii. Ce folosiți voi?",
        t2t: "Ați jucat Shatterverse?",
        t2b: "Cum se compară cu jocurile clasice Serious Sam?"
    },

    en: {
        navHome: "Home",
        navNews: "News",
        navMods: "Mods",
        navForum: "Forum",
        login: "Log in",
        register: "Create account",
        logout: "Log out",
        username: "Username",
        password: "Password",
        haveAccount: "Already have an account? Log in",
        noAccount: "No account? Create one",
        welcome: "Hello, ",
        heroBtnNews: "Read the news",
        heroBtnMods: "Browse mods",
        latestNews: "Latest news",
        source: "Source",
        install: "Install",
        installed: "Installed",
        uninstall: "Remove",
        download: "Download file",
        uploadTitle: "Add a mod",
        uploadName: "Mod name",
        uploadBtn: "Upload mod",
        loginNeeded: "You need to log in for this action.",
        threadTitle: "Thread title",
        threadBody: "Your message",
        post: "Post",
        reply: "Reply",
        replyPlaceholder: "Write a reply",
        fileTooBig: "The file is too large (100 MB maximum).",
        wrongLogin: "Wrong username or password.",
        userExists: "That username is already taken.",
        fillAll: "Fill in all fields.",
        saveFailed: "Could not save. Browser storage is full.",
        noItems: "Nothing here yet. Be the first.",
        uploadCover: "Mod image (optional)",
        imageInvalid: "The image must be PNG, JPG, WEBP or GIF, 3 MB at most.",
        serverError: "The server is not responding. Start it with «node frag-hall.js» and open http://localhost:3000.",
        installedFolder: "The mod was saved to the folder you chose.",
        installedDownload: "The mod was downloaded to Downloads. Move it into the game folder.",
        changeFolder: "Choose game folder",
        badName: "The name must be 3-24 letters, digits, _ or -.",
        weakPassword: "The password must be at least 6 characters.",
        navChat: "Chat",
        navTop: "Top",
        navProfile: "My profile",
        statUsers: "Users",
        statMods: "Mods",
        statThreads: "Threads",
        statDownloads: "Downloads",
        statOnline: "Online now",
        trending: "Trending mods",
        recentActivity: "Recent activity",
        topPlayers: "Most active",
        pollTitle: "Community poll",
        vote: "Vote",
        votes: "votes",
        noPoll: "There is no active poll.",
        activityMod: "uploaded the mod",
        activityThread: "started the thread",
        searchPlaceholder: "Search...",
        sortNew: "Newest",
        sortPopular: "Most popular",
        sortRated: "Top rated",
        sortReplies: "Most discussed",
        favoritesOnly: "Favorites only",
        uploadDescription: "Mod description (optional)",
        downloads: "downloads",
        yourRating: "Your rating",
        comments: "Comments",
        writeComment: "Write a comment",
        send: "Send",
        delete: "Delete",
        favorite: "Add to favorites",
        unfavorite: "Remove from favorites",
        confirmDelete: "Really delete? This cannot be undone.",
        pin: "Pin",
        unpin: "Unpin",
        pinned: "Pinned",
        repliesLabel: "replies",
        likesLabel: "Likes",
        chatTitle: "Live chat",
        chatPlaceholder: "Write a message",
        topTitle: "Leaderboard",
        points: "points",
        rank: "Ranks",
        bio: "About me",
        bioPlaceholder: "Say a few words about yourself",
        saveBio: "Save",
        changeAvatar: "Change profile picture",
        memberSince: "Member since",
        profileSaved: "Profile saved.",
        changePassword: "Change password",
        oldPassword: "Old password",
        newPassword: "New password",
        passwordChanged: "Password changed.",
        admin: "Administrator",
        addNews: "Add a news item",
        newsTitleField: "News title",
        newsBodyField: "News text",
        newsLink: "Source link (optional)",
        publish: "Publish",
        createPoll: "Create a new poll",
        pollQuestion: "Question",
        pollOptions: "Options, one per line",
        notifications: "Notifications",
        noNotifications: "No notifications.",
        notifReply: "replied to the thread",
        notifComment: "commented on the mod",
        soundTitle: "Sounds",
        crosshairTitle: "Crosshair",
        forbidden: "You are not allowed to do that.",
        rateLimited: "Too many requests. Try again in a moment.",
        notFound: "Nothing found.",
        close: "Close",
        modUploaded: "The mod was uploaded.",
        navMessages: "Messages",
        messagesTitle: "Private messages",
        noConversations: "You have no conversations yet.",
        writeMessage: "Write a private message",
        messageUser: "Send message",
        selectConversation: "Pick a conversation",
        newMessages: "New messages",
        ban: "Ban",
        unban: "Unban",
        banned: "Banned",
        bannedMsg: "Your account is banned and cannot post.",
        feature: "Mod of the week",
        unfeature: "Remove from Mod of the week",
        featuredTitle: "Mod of the week",
        openMod: "View mod",
        addScreenshot: "Add screenshot",
        uploadGallery: "Screenshots (up to 4, optional)",
        konami: "BFG 9000 activated!",
        badge_talker: "Talker",
        badgeDesc_talker: "Opened a first thread",
        badge_chatterbox: "Chatterbox",
        badgeDesc_chatterbox: "10 forum replies",
        badge_modder: "Modder",
        badgeDesc_modder: "Uploaded a mod",
        badge_prolific: "Mod factory",
        badgeDesc_prolific: "5 mods uploaded",
        badge_popular: "Popular",
        badgeDesc_popular: "50 downloads on your mods",
        badge_loved: "Beloved",
        badgeDesc_loved: "10 likes received",
        badge_veteran: "Veteran",
        badgeDesc_veteran: "Member for over 30 days",
        badge_slayer: "Slayer",
        badgeDesc_slayer: "Over 150 points",
        badge_admin: "Administrator",
        badgeDesc_admin: "Runs the site",
        author: "by",
        community: "community",
        gameAll: "All",
        heroTitleAll: "Frag Hall",
        heroTitleDoom: "Doom",
        heroTitleQuake: "Quake",
        heroTitleSam: "Serious Sam",
        heroTextAll: "News, mods and discussion about Doom, Quake and Serious Sam in one place.",
        heroTextDoom: "The Slayer rides on. News, mods and discussion about Doom.",
        heroTextQuake: "30 years of Quake. Follow the new episode and the modding scene.",
        heroTextSam: "Endless hordes. Everything happening right now with Serious Sam.",
        n1t: "Quake gets a new episode: Dawn of the Machine",
        n1d: "For Quake's 30th anniversary, MachineGames and id Software released a new episode as a free update on PC and consoles.",
        n2t: "Serious Sam: Shatterverse is out",
        n2d: "A multiplayer roguelite shooter in the Serious Sam series launched on 31 August 2026 on PC, PlayStation 5 and Xbox Series X|S.",
        n3t: "Quake Champions stops getting new content",
        n3d: "On 23 September 2026, Bethesda announced the game will no longer receive content updates.",
        n4t: "Doom lands in World of Tanks",
        n4d: "Battle Pass Special: Doom runs in World of Tanks from 1 to 11 October, with a BFG-inspired tank.",
        n5t: "Doom Collection comes to Evercade",
        n5d: "The Doom Collection cartridge and the Evercade Nexus Doom Edition arrive in October 2026.",
        n6t: "Doom: The Dark Ages gets a hotfix",
        n6d: "Revelations Update 4 Hotfix 2 fixes various bugs and some crashes.",
        t1t: "What is the best mod for Doom?",
        t1b: "I want something that changes weapons and enemies. What do you use?",
        t2t: "Has anyone played Shatterverse?",
        t2b: "How does it compare to the classic Serious Sam games?"
    },

    ru: {
        navHome: "Главная",
        navNews: "Новости",
        navMods: "Моды",
        navForum: "Форум",
        login: "Войти",
        register: "Создать аккаунт",
        logout: "Выйти",
        username: "Имя пользователя",
        password: "Пароль",
        haveAccount: "Уже есть аккаунт? Войти",
        noAccount: "Нет аккаунта? Создать",
        welcome: "Привет, ",
        heroBtnNews: "Читать новости",
        heroBtnMods: "Смотреть моды",
        latestNews: "Последние новости",
        source: "Источник",
        install: "Установить",
        installed: "Установлено",
        uninstall: "Удалить",
        download: "Скачать файл",
        uploadTitle: "Добавить мод",
        uploadName: "Название мода",
        uploadBtn: "Загрузить мод",
        loginNeeded: "Для этого действия нужно войти в аккаунт.",
        threadTitle: "Заголовок темы",
        threadBody: "Ваше сообщение",
        post: "Опубликовать",
        reply: "Ответить",
        replyPlaceholder: "Напишите ответ",
        fileTooBig: "Файл слишком большой (максимум 100 МБ).",
        wrongLogin: "Неверное имя или пароль.",
        userExists: "Это имя уже занято.",
        fillAll: "Заполните все поля.",
        saveFailed: "Не удалось сохранить. Память браузера заполнена.",
        noItems: "Здесь пока пусто. Будьте первым.",
        uploadCover: "Изображение для мода (необязательно)",
        imageInvalid: "Изображение должно быть PNG, JPG, WEBP или GIF, не больше 3 МБ.",
        serverError: "Сервер не отвечает. Запустите его командой «node frag-hall.js» и откройте http://localhost:3000.",
        installedFolder: "Мод сохранён в выбранную папку.",
        installedDownload: "Мод скачан в «Загрузки». Перенесите его в папку игры.",
        changeFolder: "Выбрать папку игры",
        badName: "Имя: 3–24 буквы, цифры, _ или -.",
        weakPassword: "Пароль должен быть не короче 6 символов.",
        navChat: "Чат",
        navTop: "Топ",
        navProfile: "Мой профиль",
        statUsers: "Пользователи",
        statMods: "Моды",
        statThreads: "Темы",
        statDownloads: "Скачивания",
        statOnline: "Сейчас онлайн",
        trending: "Популярные моды",
        recentActivity: "Недавняя активность",
        topPlayers: "Самые активные",
        pollTitle: "Опрос сообщества",
        vote: "Голосовать",
        votes: "голосов",
        noPoll: "Активных опросов нет.",
        activityMod: "загрузил мод",
        activityThread: "открыл тему",
        searchPlaceholder: "Поиск...",
        sortNew: "Новые",
        sortPopular: "Популярные",
        sortRated: "С лучшей оценкой",
        sortReplies: "Самые обсуждаемые",
        favoritesOnly: "Только избранное",
        uploadDescription: "Описание мода (необязательно)",
        downloads: "скачиваний",
        yourRating: "Ваша оценка",
        comments: "Комментарии",
        writeComment: "Напишите комментарий",
        send: "Отправить",
        delete: "Удалить",
        favorite: "В избранное",
        unfavorite: "Убрать из избранного",
        confirmDelete: "Точно удалить? Это нельзя отменить.",
        pin: "Закрепить",
        unpin: "Открепить",
        pinned: "Закреплено",
        repliesLabel: "ответов",
        likesLabel: "Лайки",
        chatTitle: "Чат",
        chatPlaceholder: "Напишите сообщение",
        topTitle: "Рейтинг",
        points: "очков",
        rank: "Звания",
        bio: "О себе",
        bioPlaceholder: "Расскажите немного о себе",
        saveBio: "Сохранить",
        changeAvatar: "Сменить аватар",
        memberSince: "На сайте с",
        profileSaved: "Профиль сохранён.",
        changePassword: "Сменить пароль",
        oldPassword: "Старый пароль",
        newPassword: "Новый пароль",
        passwordChanged: "Пароль изменён.",
        admin: "Администратор",
        addNews: "Добавить новость",
        newsTitleField: "Заголовок новости",
        newsBodyField: "Текст новости",
        newsLink: "Ссылка на источник (необязательно)",
        publish: "Опубликовать",
        createPoll: "Создать новый опрос",
        pollQuestion: "Вопрос",
        pollOptions: "Варианты, по одному в строке",
        notifications: "Уведомления",
        noNotifications: "Нет уведомлений.",
        notifReply: "ответил в теме",
        notifComment: "прокомментировал мод",
        soundTitle: "Звуки",
        crosshairTitle: "Прицел",
        forbidden: "Вам это запрещено.",
        rateLimited: "Слишком много запросов. Попробуйте позже.",
        notFound: "Ничего не найдено.",
        close: "Закрыть",
        modUploaded: "Мод загружен.",
        navMessages: "Сообщения",
        messagesTitle: "Личные сообщения",
        noConversations: "У вас пока нет бесед.",
        writeMessage: "Напишите личное сообщение",
        messageUser: "Написать",
        selectConversation: "Выберите беседу",
        newMessages: "Новые сообщения",
        ban: "Заблокировать",
        unban: "Разблокировать",
        banned: "Заблокирован",
        bannedMsg: "Ваш аккаунт заблокирован и не может писать.",
        feature: "Мод недели",
        unfeature: "Убрать из «Мод недели»",
        featuredTitle: "Мод недели",
        openMod: "Открыть мод",
        addScreenshot: "Добавить скриншот",
        uploadGallery: "Скриншоты (до 4, необязательно)",
        konami: "BFG 9000 активирован!",
        badge_talker: "Болтун",
        badgeDesc_talker: "Открыл первую тему",
        badge_chatterbox: "Говорун",
        badgeDesc_chatterbox: "10 ответов на форуме",
        badge_modder: "Моддер",
        badgeDesc_modder: "Загрузил мод",
        badge_prolific: "Фабрика модов",
        badgeDesc_prolific: "Загружено 5 модов",
        badge_popular: "Популярный",
        badgeDesc_popular: "50 скачиваний ваших модов",
        badge_loved: "Любимец",
        badgeDesc_loved: "10 полученных лайков",
        badge_veteran: "Ветеран",
        badgeDesc_veteran: "На сайте больше 30 дней",
        badge_slayer: "Слейер",
        badgeDesc_slayer: "Больше 150 очков",
        badge_admin: "Администратор",
        badgeDesc_admin: "Управляет сайтом",
        author: "от",
        community: "сообщество",
        gameAll: "Все",
        heroTitleAll: "Frag Hall",
        heroTitleDoom: "Doom",
        heroTitleQuake: "Quake",
        heroTitleSam: "Serious Sam",
        heroTextAll: "Новости, моды и обсуждения Doom, Quake и Serious Sam в одном месте.",
        heroTextDoom: "Думгай продолжает путь. Новости, моды и обсуждения Doom.",
        heroTextQuake: "30 лет Quake. Следите за новым эпизодом и модингом.",
        heroTextSam: "Бесконечные орды. Всё, что сейчас происходит с Serious Sam.",
        n1t: "Для Quake вышел новый эпизод Dawn of the Machine",
        n1d: "К 30-летию Quake студии MachineGames и id Software выпустили новый эпизод бесплатным обновлением на ПК и консолях.",
        n2t: "Вышла Serious Sam: Shatterverse",
        n2d: "Многопользовательский рогалик-шутер серии Serious Sam вышел 31 августа 2026 на ПК, PlayStation 5 и Xbox Series X|S.",
        n3t: "Quake Champions больше не получит нового контента",
        n3d: "23 сентября 2026 года Bethesda объявила, что обновления с контентом для игры выходить не будут.",
        n4t: "Doom появился в World of Tanks",
        n4d: "Battle Pass Special: Doom идёт в World of Tanks с 1 по 11 октября, с танком в стиле BFG.",
        n5t: "Doom Collection выйдет на Evercade",
        n5d: "Картридж Doom Collection и консоль Evercade Nexus Doom Edition выйдут в октябре 2026 года.",
        n6t: "Для Doom: The Dark Ages вышел хотфикс",
        n6d: "Revelations Update 4 Hotfix 2 исправляет разные ошибки и несколько вылетов.",
        t1t: "Какой мод для Doom лучший?",
        t1b: "Ищу мод, который меняет оружие и врагов. Чем пользуетесь вы?",
        t2t: "Кто-нибудь играл в Shatterverse?",
        t2b: "Как она соотносится с классическими Serious Sam?"
    },

    fr: {
        navHome: "Accueil",
        navNews: "Actualités",
        navMods: "Mods",
        navForum: "Forum",
        login: "Se connecter",
        register: "Créer un compte",
        logout: "Se déconnecter",
        username: "Nom d'utilisateur",
        password: "Mot de passe",
        haveAccount: "Déjà un compte ? Se connecter",
        noAccount: "Pas de compte ? En créer un",
        welcome: "Salut, ",
        heroBtnNews: "Lire les actualités",
        heroBtnMods: "Voir les mods",
        latestNews: "Dernières actualités",
        source: "Source",
        install: "Installer",
        installed: "Installé",
        uninstall: "Retirer",
        download: "Télécharger le fichier",
        uploadTitle: "Ajouter un mod",
        uploadName: "Nom du mod",
        uploadBtn: "Envoyer le mod",
        loginNeeded: "Vous devez vous connecter pour cette action.",
        threadTitle: "Titre du sujet",
        threadBody: "Votre message",
        post: "Publier",
        reply: "Répondre",
        replyPlaceholder: "Écrivez une réponse",
        fileTooBig: "Le fichier est trop gros (100 Mo maximum).",
        wrongLogin: "Nom ou mot de passe incorrect.",
        userExists: "Ce nom est déjà pris.",
        fillAll: "Remplissez tous les champs.",
        saveFailed: "Enregistrement impossible. Le stockage du navigateur est plein.",
        noItems: "Rien ici pour l'instant. Soyez le premier.",
        uploadCover: "Image du mod (facultatif)",
        imageInvalid: "L'image doit être PNG, JPG, WEBP ou GIF, 3 Mo maximum.",
        serverError: "Le serveur ne répond pas. Lancez-le avec « node frag-hall.js » et ouvrez http://localhost:3000.",
        installedFolder: "Le mod a été enregistré dans le dossier choisi.",
        installedDownload: "Le mod a été téléchargé dans Téléchargements. Déplacez-le dans le dossier du jeu.",
        changeFolder: "Choisir le dossier du jeu",
        badName: "Le nom doit avoir 3 à 24 lettres, chiffres, _ ou -.",
        weakPassword: "Le mot de passe doit faire au moins 6 caractères.",
        navChat: "Chat",
        navTop: "Top",
        navProfile: "Mon profil",
        statUsers: "Utilisateurs",
        statMods: "Mods",
        statThreads: "Sujets",
        statDownloads: "Téléchargements",
        statOnline: "En ligne",
        trending: "Mods tendance",
        recentActivity: "Activité récente",
        topPlayers: "Les plus actifs",
        pollTitle: "Sondage de la communauté",
        vote: "Voter",
        votes: "votes",
        noPoll: "Aucun sondage en cours.",
        activityMod: "a ajouté le mod",
        activityThread: "a ouvert le sujet",
        searchPlaceholder: "Rechercher...",
        sortNew: "Plus récents",
        sortPopular: "Plus populaires",
        sortRated: "Mieux notés",
        sortReplies: "Plus commentés",
        favoritesOnly: "Favoris seulement",
        uploadDescription: "Description du mod (facultatif)",
        downloads: "téléchargements",
        yourRating: "Votre note",
        comments: "Commentaires",
        writeComment: "Écrivez un commentaire",
        send: "Envoyer",
        delete: "Supprimer",
        favorite: "Ajouter aux favoris",
        unfavorite: "Retirer des favoris",
        confirmDelete: "Vraiment supprimer ? C'est irréversible.",
        pin: "Épingler",
        unpin: "Désépingler",
        pinned: "Épinglé",
        repliesLabel: "réponses",
        likesLabel: "J'aime",
        chatTitle: "Chat en direct",
        chatPlaceholder: "Écrivez un message",
        topTitle: "Classement",
        points: "points",
        rank: "Grades",
        bio: "À propos",
        bioPlaceholder: "Dites quelques mots sur vous",
        saveBio: "Enregistrer",
        changeAvatar: "Changer la photo de profil",
        memberSince: "Membre depuis",
        profileSaved: "Profil enregistré.",
        changePassword: "Changer le mot de passe",
        oldPassword: "Ancien mot de passe",
        newPassword: "Nouveau mot de passe",
        passwordChanged: "Mot de passe modifié.",
        admin: "Administrateur",
        addNews: "Ajouter une actualité",
        newsTitleField: "Titre de l'actualité",
        newsBodyField: "Texte de l'actualité",
        newsLink: "Lien vers la source (facultatif)",
        publish: "Publier",
        createPoll: "Créer un nouveau sondage",
        pollQuestion: "Question",
        pollOptions: "Choix, un par ligne",
        notifications: "Notifications",
        noNotifications: "Aucune notification.",
        notifReply: "a répondu au sujet",
        notifComment: "a commenté le mod",
        soundTitle: "Sons",
        crosshairTitle: "Viseur",
        forbidden: "Vous n'avez pas le droit de faire cela.",
        rateLimited: "Trop de requêtes. Réessayez dans un instant.",
        notFound: "Introuvable.",
        close: "Fermer",
        modUploaded: "Le mod a été envoyé.",
        navMessages: "Messages",
        messagesTitle: "Messages privés",
        noConversations: "Vous n'avez pas encore de conversation.",
        writeMessage: "Écrire un message privé",
        messageUser: "Envoyer un message",
        selectConversation: "Choisissez une conversation",
        newMessages: "Nouveaux messages",
        ban: "Bannir",
        unban: "Débannir",
        banned: "Banni",
        bannedMsg: "Votre compte est banni et ne peut pas écrire.",
        feature: "Mod de la semaine",
        unfeature: "Retirer du Mod de la semaine",
        featuredTitle: "Mod de la semaine",
        openMod: "Voir le mod",
        addScreenshot: "Ajouter une capture",
        uploadGallery: "Captures d'écran (jusqu'à 4, facultatif)",
        konami: "BFG 9000 activé !",
        badge_talker: "Bavard",
        badgeDesc_talker: "A ouvert un premier sujet",
        badge_chatterbox: "Moulin à paroles",
        badgeDesc_chatterbox: "10 réponses sur le forum",
        badge_modder: "Modder",
        badgeDesc_modder: "A envoyé un mod",
        badge_prolific: "Usine à mods",
        badgeDesc_prolific: "5 mods envoyés",
        badge_popular: "Populaire",
        badgeDesc_popular: "50 téléchargements de vos mods",
        badge_loved: "Adoré",
        badgeDesc_loved: "10 J'aime reçus",
        badge_veteran: "Vétéran",
        badgeDesc_veteran: "Membre depuis plus de 30 jours",
        badge_slayer: "Slayer",
        badgeDesc_slayer: "Plus de 150 points",
        badge_admin: "Administrateur",
        badgeDesc_admin: "Gère le site",
        author: "par",
        community: "communauté",
        gameAll: "Tous",
        heroTitleAll: "Frag Hall",
        heroTitleDoom: "Doom",
        heroTitleQuake: "Quake",
        heroTitleSam: "Serious Sam",
        heroTextAll: "Actualités, mods et discussions sur Doom, Quake et Serious Sam au même endroit.",
        heroTextDoom: "Le Slayer continue sa route. Actualités, mods et discussions sur Doom.",
        heroTextQuake: "30 ans de Quake. Suivez le nouvel épisode et la scène du modding.",
        heroTextSam: "Des hordes sans fin. Tout ce qui se passe maintenant pour Serious Sam.",
        n1t: "Quake reçoit un nouvel épisode : Dawn of the Machine",
        n1d: "Pour les 30 ans de Quake, MachineGames et id Software ont publié un nouvel épisode en mise à jour gratuite sur PC et consoles.",
        n2t: "Serious Sam: Shatterverse est sorti",
        n2d: "Un shooter roguelite multijoueur de la série Serious Sam est sorti le 31 août 2026 sur PC, PlayStation 5 et Xbox Series X|S.",
        n3t: "Quake Champions ne recevra plus de contenu",
        n3d: "Le 23 septembre 2026, Bethesda a annoncé que le jeu ne recevrait plus de mises à jour de contenu.",
        n4t: "Doom arrive dans World of Tanks",
        n4d: "Le Battle Pass Special : Doom est disponible dans World of Tanks du 1er au 11 octobre, avec un char inspiré du BFG.",
        n5t: "Doom Collection arrive sur Evercade",
        n5d: "La cartouche Doom Collection et l'Evercade Nexus Doom Edition sortent en octobre 2026.",
        n6t: "Doom: The Dark Ages reçoit un correctif",
        n6d: "Revelations Update 4 Hotfix 2 corrige divers bugs et quelques plantages.",
        t1t: "Quel est le meilleur mod pour Doom ?",
        t1b: "Je cherche un mod qui change les armes et les ennemis. Que utilisez-vous ?",
        t2t: "Quelqu'un a joué à Shatterverse ?",
        t2b: "Comment se compare-t-il aux Serious Sam classiques ?"
    }

};
`,

    script: String.raw`const newsItems = [
    { id: "n4", game: "doom", date: "2026-10-01", url: "https://slayersclub.bethesda.net/en-US/news/doom-world-of-tanks-event" },
    { id: "n5", game: "doom", date: "2026-10", url: "https://slayersclub.bethesda.net/en-US/news/quakecon-2026-news" },
    { id: "n3", game: "quake", date: "2026-09-23", url: "https://en.wikipedia.org/wiki/Quake_Champions" },
    { id: "n2", game: "sam", date: "2026-08-31", url: "https://en.wikipedia.org/wiki/Serious_Sam:_Shatterverse" },
    { id: "n1", game: "quake", date: "2026-08", url: "https://slayersclub.bethesda.net/en-US/news/quakecon-2026-news" },
    { id: "n6", game: "doom", date: "2026-07", url: "https://slayersclub.bethesda.net/en-US/news/doom-the-dark-ages-revelations-update-4-hotfix-2-release-notes" }
];

const gameNames = {
    all: "Frag Hall",
    doom: "Doom",
    quake: "Quake",
    sam: "Serious Sam"
};

const rankNames = ["Zombieman", "Imp", "Cacodemon", "Baron of Hell", "Cyberdemon", "Icon of Sin"];
const rankLimits = [0, 20, 60, 150, 400, 1000];

const errorKeys = {
    exists: "userExists",
    wrong: "wrongLogin",
    fill: "fillAll",
    login: "loginNeeded",
    size: "fileTooBig",
    name: "badName",
    weak: "weakPassword",
    image: "imageInvalid",
    forbidden: "forbidden",
    rate: "rateLimited",
    notfound: "notFound",
    banned: "bannedMsg"
};

const maxFileSize = 100 * 1024 * 1024;
const maxImageSize = 3 * 1024 * 1024;
const validPages = ["home", "news", "mods", "forum", "chat", "top", "messages", "profile", "account"];
const badgeIcons = { talker: "💬", chatterbox: "🗣️", modder: "🔧", prolific: "🏭", popular: "🔥", loved: "❤️", veteran: "🛡️", slayer: "💀", admin: "⭐" };
const konamiCode = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

const storage = {

    read(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (error) {
            return fallback;
        }
    },

    write(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            return false;
        }
    }

};

const state = {
    language: storage.read("fh_language", "ro"),
    game: "all",
    page: "home",
    profileName: null,
    registerMode: false,
    user: null,
    token: storage.read("fh_token", null),
    threads: [],
    mods: [],
    news: [],
    poll: null,
    stats: null,
    top: [],
    notifications: [],
    notificationsOpen: false,
    chat: { channel: "all", messages: [], since: 0 },
    installedMods: storage.read("fh_installed", []),
    modSearch: "",
    modSort: "new",
    onlyFavorites: false,
    forumSearch: "",
    forumSort: "new",
    openModId: null,
    avatarVersion: 0,
    unread: 0,
    unreadMessages: 0,
    messageWith: null,
    conversations: [],
    thread: [],
    featured: null,
    sound: storage.read("fh_sound", false),
    crosshair: storage.read("fh_crosshair", false)
};

let serverWarningShown = false;
let animateCards = true;
let chatTimer = null;
let messageTimer = null;
let konamiIndex = 0;
let audioContext = null;

function t(key) {
    const current = translations[state.language];
    return (current && current[key]) || translations.en[key] || key;
}

function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== undefined) {
        element.textContent = text;
    }

    return element;
}

function createButton(label, className, handler) {
    const element = createElement("button", className, label);
    element.type = "button";
    element.addEventListener("click", handler);
    return element;
}

function byId(id) {
    return document.getElementById(id);
}

function matchesGame(item) {
    return state.game === "all" || item.game === state.game;
}

function isAdmin() {
    return Boolean(state.user) && state.user.role === "admin";
}

function canManage(author) {
    return Boolean(state.user) && (state.user.name === author || isAdmin());
}

function formatSize(bytes) {
    if (bytes < 1048576) {
        return Math.max(1, Math.round(bytes / 1024)) + " KB";
    }

    return (bytes / 1048576).toFixed(1) + " MB";
}

function formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString(state.language);
}

function timeAgo(timestamp) {
    const seconds = Math.round((timestamp - Date.now()) / 1000);
    const absolute = Math.abs(seconds);
    const formatter = new Intl.RelativeTimeFormat(state.language, { numeric: "auto" });

    if (absolute < 60) {
        return formatter.format(seconds, "second");
    }

    if (absolute < 3600) {
        return formatter.format(Math.round(seconds / 60), "minute");
    }

    if (absolute < 86400) {
        return formatter.format(Math.round(seconds / 3600), "hour");
    }

    return formatter.format(Math.round(seconds / 86400), "day");
}

function reveal(node, index) {
    if (animateCards) {
        node.classList.add("reveal");
        node.style.setProperty("--i", Math.min(index, 12));
    }

    return node;
}

function toast(message, kind) {
    const container = byId("toasts");
    const node = createElement("div", "toast " + (kind || "info"), message);

    container.appendChild(node);

    setTimeout(function () {
        node.classList.add("leaving");
    }, 3200);

    setTimeout(function () {
        node.remove();
    }, 3700);
}

function playSound(kind) {
    if (!state.sound) {
        return;
    }

    try {
        audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();

        const now = audioContext.currentTime;
        const gain = audioContext.createGain();
        gain.connect(audioContext.destination);

        if (kind === "boom") {
            const length = Math.floor(audioContext.sampleRate * 0.3);
            const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
            const data = buffer.getChannelData(0);

            for (let index = 0; index < length; index++) {
                data[index] = (Math.random() * 2 - 1) * Math.pow(1 - index / length, 3);
            }

            const source = audioContext.createBufferSource();
            source.buffer = buffer;
            gain.gain.value = 0.3;
            source.connect(gain);
            source.start();
            return;
        }

        const oscillator = audioContext.createOscillator();
        oscillator.type = "square";
        oscillator.frequency.setValueAtTime(620, now);
        oscillator.frequency.exponentialRampToValueAtTime(180, now + 0.09);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        oscillator.connect(gain);
        oscillator.start(now);
        oscillator.stop(now + 0.11);
    } catch (error) {
        console.error(error);
    }
}

async function request(path, options) {
    const settings = options || {};
    const headers = settings.headers || {};

    if (state.token) {
        headers.Authorization = "Bearer " + state.token;
    }

    let response;

    try {
        response = await fetch(path, {
            method: settings.method || "GET",
            headers: headers,
            body: settings.body
        });
    } catch (error) {
        throw new Error("network");
    }

    if (!response.ok) {
        let code = "server";

        try {
            const data = await response.json();
            code = data.error || code;
        } catch (error) {
            code = "server";
        }

        throw new Error(code);
    }

    return response;
}

function showError(error) {
    if (error.message === "network") {
        if (!serverWarningShown) {
            serverWarningShown = true;
            toast(t("serverError"), "error");
        }

        return;
    }

    toast(t(errorKeys[error.message] || "serverError"), "error");
}

async function act(path, data, method) {
    try {
        const response = await request(path, {
            method: method || "POST",
            headers: data ? { "Content-Type": "application/json" } : {},
            body: data ? JSON.stringify(data) : undefined
        });

        return await response.json();
    } catch (error) {
        showError(error);
        return null;
    }
}

function openDatabase() {
    return new Promise(function (resolve, reject) {
        const openRequest = indexedDB.open("fraghall", 1);

        openRequest.onupgradeneeded = function () {
            openRequest.result.createObjectStore("handles");
        };

        openRequest.onsuccess = function () {
            resolve(openRequest.result);
        };

        openRequest.onerror = function () {
            reject(openRequest.error);
        };
    });
}

async function saveHandle(handle) {
    const database = await openDatabase();

    return new Promise(function (resolve, reject) {
        const transaction = database.transaction("handles", "readwrite");
        transaction.objectStore("handles").put(handle, "folder");
        transaction.oncomplete = resolve;
        transaction.onerror = function () {
            reject(transaction.error);
        };
    });
}

async function loadHandle() {
    const database = await openDatabase();

    return new Promise(function (resolve, reject) {
        const transaction = database.transaction("handles", "readonly");
        const getRequest = transaction.objectStore("handles").get("folder");

        getRequest.onsuccess = function () {
            resolve(getRequest.result || null);
        };

        getRequest.onerror = function () {
            reject(getRequest.error);
        };
    });
}

async function pickFolder() {
    try {
        const handle = await window.showDirectoryPicker({ mode: "readwrite" });
        await saveHandle(handle);
        return handle;
    } catch (error) {
        return null;
    }
}

async function getFolder() {
    if (!window.showDirectoryPicker) {
        return null;
    }

    let handle = null;

    try {
        handle = await loadHandle();
    } catch (error) {
        handle = null;
    }

    if (handle) {
        try {
            const permission = await handle.requestPermission({ mode: "readwrite" });

            if (permission === "granted") {
                return handle;
            }
        } catch (error) {
            handle = null;
        }
    }

    return pickFolder();
}

async function writeBlobToFolder(folder, blob, fileName) {
    try {
        const fileHandle = await folder.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();

        await writable.write(blob);
        await writable.close();

        return true;
    } catch (error) {
        return false;
    }
}

function saveBlobAsDownload(blob, fileName) {
    const address = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = address;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(function () {
        URL.revokeObjectURL(address);
    }, 5000);
}

function markInstalled(modId) {
    if (!state.installedMods.includes(modId)) {
        state.installedMods.push(modId);
    }

    storage.write("fh_installed", state.installedMods);
    renderCurrent();
    renderModal();
}

async function installMod(mod) {
    const folder = await getFolder();

    let blob;

    try {
        const response = await request("/api/mods/" + mod.id + "/file");
        blob = await response.blob();
    } catch (error) {
        showError(error);
        return;
    }

    let written = false;

    if (folder) {
        written = await writeBlobToFolder(folder, blob, mod.fileName);
    }

    if (written) {
        toast(t("installedFolder"), "success");
    } else {
        saveBlobAsDownload(blob, mod.fileName);
        toast(t("installedDownload"), "success");
    }

    playSound("boom");
    markInstalled(mod.id);
}

async function uninstallMod(mod) {
    try {
        const handle = await loadHandle();

        if (handle) {
            const permission = await handle.queryPermission({ mode: "readwrite" });

            if (permission === "granted") {
                await handle.removeEntry(mod.fileName);
            }
        }
    } catch (error) {
        console.error(error);
    }

    state.installedMods = state.installedMods.filter(function (id) {
        return id !== mod.id;
    });

    storage.write("fh_installed", state.installedMods);
    renderCurrent();
    renderModal();
}

function hueFor(name) {
    let sum = 0;

    for (let index = 0; index < name.length; index++) {
        sum = (sum * 31 + name.charCodeAt(index)) % 360;
    }

    return sum;
}

function avatarNode(name, hasPicture, size) {
    const wrapper = createElement("span", "avatar");
    wrapper.style.setProperty("--size", (size || 36) + "px");
    wrapper.style.setProperty("--hue", hueFor(name));

    const initial = name.charAt(0).toUpperCase();

    if (hasPicture) {
        const image = createElement("img");
        image.alt = name;
        image.src = "/api/users/" + encodeURIComponent(name) + "/avatar?v=" + state.avatarVersion;

        image.addEventListener("error", function () {
            image.remove();
            wrapper.textContent = initial;
        });

        wrapper.appendChild(image);
    } else {
        wrapper.textContent = initial;
    }

    return wrapper;
}

function userLink(name, hasPicture) {
    const link = createElement("button", "user-link");
    link.type = "button";
    link.appendChild(avatarNode(name, hasPicture, 28));
    link.appendChild(createElement("span", "", name));

    link.addEventListener("click", function () {
        closeModal();
        navigate("profile", name);
    });

    return link;
}

function starsText(average) {
    const full = Math.round(average);
    return "★".repeat(full) + "☆".repeat(5 - full);
}

function placeholderFor(mod) {
    const palette = {
        doom: ["#3a0a05", "#ff3b14", "#ffb02e"],
        quake: ["#1f1b10", "#c9923f", "#8fb0c4"],
        sam: ["#06223a", "#2fb7ff", "#ffd23f"]
    };

    const colors = palette[mod.game];
    const letters = mod.name.replace(/[^\p{L}\p{N}]/gu, "").slice(0, 2).toUpperCase() || "?";

    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180">'
        + '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
        + '<stop offset="0" stop-color="' + colors[0] + '"/>'
        + '<stop offset="1" stop-color="' + colors[1] + '"/>'
        + '</linearGradient></defs>'
        + '<rect width="320" height="180" fill="url(#g)"/>'
        + '<text x="160" y="120" text-anchor="middle" font-size="100" font-weight="700" font-family="Impact, sans-serif" fill="' + colors[2] + '" fill-opacity="0.9">' + letters + '</text>'
        + '</svg>';

    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

function modImage(mod) {
    const image = createElement("img");
    image.alt = mod.name;
    image.loading = "lazy";
    image.src = mod.hasImage ? "/api/mods/" + mod.id + "/image" : placeholderFor(mod);

    image.addEventListener("error", function () {
        image.src = placeholderFor(mod);
    });

    return image;
}

function applyTranslations() {
    document.documentElement.lang = state.language;

    document.querySelectorAll("[data-i18n]").forEach(function (node) {
        node.textContent = t(node.dataset.i18n);
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (node) {
        node.placeholder = t(node.dataset.i18nPlaceholder);
    });

    document.querySelectorAll("[data-i18n-title]").forEach(function (node) {
        node.title = t(node.dataset.i18nTitle);
        node.setAttribute("aria-label", t(node.dataset.i18nTitle));
    });

    byId("langSelect").value = state.language;
}

function renderHeader() {
    applyTranslations();

    const accountButton = byId("accountButton");
    accountButton.replaceChildren();

    if (state.user) {
        accountButton.appendChild(avatarNode(state.user.name, state.user.hasAvatar, 24));
        accountButton.appendChild(createElement("span", "", state.user.name));
    } else {
        accountButton.textContent = t("login");
    }

    byId("bellButton").hidden = !state.user;
    byId("messageButton").hidden = !state.user;

    const messageBadge = byId("messageBadge");
    messageBadge.textContent = state.unreadMessages;
    messageBadge.hidden = state.unreadMessages === 0;

    const badge = byId("bellBadge");
    badge.textContent = state.unread;
    badge.hidden = state.unread === 0;

    byId("soundButton").classList.toggle("on", state.sound);
    byId("crosshairButton").classList.toggle("on", state.crosshair);
    document.body.classList.toggle("crosshair-on", state.crosshair);

    const heroKey = state.game.charAt(0).toUpperCase() + state.game.slice(1);
    byId("heroTitle").textContent = t("heroTitle" + heroKey);
    byId("heroTitle").dataset.text = t("heroTitle" + heroKey);
    byId("heroText").textContent = t("heroText" + heroKey);

    const loggedIn = Boolean(state.user);

    byId("guestPanel").style.display = loggedIn ? "none" : "block";
    byId("userPanel").style.display = loggedIn ? "block" : "none";

    ["uploadNotice", "forumNotice"].forEach(function (id) {
        byId(id).style.display = loggedIn ? "none" : "block";
    });

    byId("uploadForm").style.display = loggedIn ? "flex" : "none";
    byId("threadForm").style.display = loggedIn ? "flex" : "none";
    byId("chatForm").style.display = loggedIn ? "flex" : "none";
    byId("chatNotice").style.display = loggedIn ? "none" : "block";
    byId("adminPanel").style.display = isAdmin() ? "block" : "none";

    const authTitle = state.registerMode ? t("register") : t("login");
    byId("authTitle").textContent = authTitle;
    byId("authSubmit").textContent = authTitle;
    byId("authToggle").textContent = state.registerMode ? t("haveAccount") : t("noAccount");

    if (loggedIn) {
        byId("welcomeText").textContent = t("welcome") + state.user.name;
    }
}

function animateCounter(node, target) {
    const start = Number(node.dataset.value || 0);
    node.dataset.value = target;

    if (start === target || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        node.textContent = target;
        return;
    }

    const begin = performance.now();

    function step(now) {
        const progress = Math.min((now - begin) / 800, 1);
        node.textContent = Math.round(start + (target - start) * progress);

        if (progress < 1) {
            requestAnimationFrame(step);
        }
    }

    requestAnimationFrame(step);
}

function renderStats() {
    const container = byId("statsRow");
    const stats = state.stats;

    if (!stats) {
        return;
    }

    const items = [
        ["statUsers", stats.users],
        ["statMods", stats.mods],
        ["statThreads", stats.threads],
        ["statDownloads", stats.downloads],
        ["statOnline", stats.online]
    ];

    if (container.children.length !== items.length) {
        container.replaceChildren();

        items.forEach(function (item, index) {
            const box = reveal(createElement("div", "stat"), index);
            box.appendChild(createElement("strong", "", "0"));
            box.appendChild(createElement("span", ""));
            container.appendChild(box);
        });
    }

    items.forEach(function (item, index) {
        const box = container.children[index];
        animateCounter(box.querySelector("strong"), item[1]);
        box.querySelector("span").textContent = t(item[0]);
    });
}

function mergedNews() {
    const custom = state.news.filter(matchesGame).map(function (item) {
        return {
            custom: true,
            id: item.id,
            game: item.game,
            title: item.title,
            text: item.body,
            date: formatDate(item.createdAt),
            url: item.url
        };
    });

    const builtIn = newsItems.filter(matchesGame).map(function (item) {
        return {
            custom: false,
            id: item.id,
            game: item.game,
            title: t(item.id + "t"),
            text: t(item.id + "d"),
            date: item.date,
            url: item.url
        };
    });

    return custom.concat(builtIn);
}

function renderNewsList(container, limit) {
    container.replaceChildren();

    mergedNews().slice(0, limit || 100).forEach(function (item, index) {
        const card = reveal(createElement("article", "news-card tilt"), index);

        card.appendChild(createElement("div", "meta", gameNames[item.game] + "  " + item.date));
        card.appendChild(createElement("h4", "", item.title));
        card.appendChild(createElement("p", "", item.text));

        const footer = createElement("div", "card-footer");

        if (item.url) {
            const link = createElement("a", "", t("source"));
            link.href = item.url;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            footer.appendChild(link);
        }

        if (item.custom && isAdmin()) {
            footer.appendChild(createButton(t("delete"), "danger small", async function () {
                if (window.confirm(t("confirmDelete"))) {
                    await act("/api/news/" + item.id, null, "DELETE");
                    await loadData();
                }
            }));
        }

        card.appendChild(footer);
        container.appendChild(card);
    });
}

function renderPoll() {
    const box = byId("pollBox");
    box.replaceChildren();

    const poll = state.poll;

    if (!poll) {
        box.appendChild(createElement("p", "empty", t("noPoll")));
        return;
    }

    box.appendChild(createElement("h4", "poll-question", poll.question));

    poll.options.forEach(function (option, index) {
        const percent = poll.total ? Math.round((option.votes / poll.total) * 100) : 0;
        const row = createElement("div", "poll-row" + (poll.myVote === index ? " mine" : ""));

        const bar = createElement("div", "poll-bar");
        bar.style.setProperty("--percent", percent + "%");
        row.appendChild(bar);

        row.appendChild(createElement("span", "poll-text", option.text));
        row.appendChild(createElement("span", "poll-count", option.votes + " | " + percent + "%"));

        if (poll.myVote === -1) {
            row.appendChild(createButton(t("vote"), "small", async function () {
                if (!state.user) {
                    toast(t("loginNeeded"), "error");
                    return;
                }

                const result = await act("/api/poll/vote", { option: index });

                if (result) {
                    state.poll = result;
                    renderPoll();
                }
            }));
        }

        box.appendChild(row);
    });

    box.appendChild(createElement("small", "muted", poll.total + " " + t("votes")));
}

function modCard(mod, index) {
    const card = reveal(createElement("article", "mod-card tilt"), index);

    const picture = createElement("div", "mod-picture");
    picture.appendChild(modImage(mod));
    picture.appendChild(createElement("span", "mod-tag", gameNames[mod.game]));

    const heart = createButton(mod.favorite ? "♥" : "♡", "heart" + (mod.favorite ? " on" : ""), async function (event) {
        event.stopPropagation();

        if (!state.user) {
            toast(t("loginNeeded"), "error");
            return;
        }

        await act("/api/mods/" + mod.id + "/favorite");
        await loadData();
    });

    heart.title = mod.favorite ? t("unfavorite") : t("favorite");
    picture.appendChild(heart);

    picture.addEventListener("click", function () {
        openMod(mod.id);
    });

    card.appendChild(picture);

    const body = createElement("div", "mod-body");

    const title = createElement("strong", "mod-title", mod.name);
    title.addEventListener("click", function () {
        openMod(mod.id);
    });

    body.appendChild(title);
    body.appendChild(createElement("div", "rating-line", starsText(mod.ratingAverage) + "  " + mod.ratingAverage.toFixed(1) + " (" + mod.ratingCount + ")"));
    body.appendChild(createElement("small", "", t("author") + " " + mod.author + " | " + formatSize(mod.size) + " | " + mod.downloads + " " + t("downloads")));

    const actions = createElement("div", "mod-actions");
    const isInstalled = state.installedMods.includes(mod.id);

    actions.appendChild(createButton(isInstalled ? t("installed") + " | " + t("uninstall") : t("install"), isInstalled ? "installed" : "", function () {
        if (isInstalled) {
            uninstallMod(mod);
        } else {
            installMod(mod);
        }
    }));

    const downloadLink = createElement("a", "", t("download"));
    downloadLink.href = "/api/mods/" + mod.id + "/file";
    actions.appendChild(downloadLink);

    body.appendChild(actions);
    card.appendChild(body);

    return card;
}

function filteredMods() {
    const query = state.modSearch.trim().toLowerCase();

    let mods = state.mods.filter(matchesGame);

    if (state.onlyFavorites) {
        mods = mods.filter(function (mod) {
            return mod.favorite;
        });
    }

    if (query) {
        mods = mods.filter(function (mod) {
            return (mod.name + " " + mod.author + " " + mod.description).toLowerCase().includes(query);
        });
    }

    return mods.slice().sort(function (first, second) {
        if (state.modSort === "popular") {
            return second.downloads - first.downloads;
        }

        if (state.modSort === "rated") {
            return second.ratingAverage - first.ratingAverage || second.ratingCount - first.ratingCount;
        }

        return second.createdAt - first.createdAt;
    });
}

function renderMods() {
    const container = byId("modList");
    container.replaceChildren();

    const mods = filteredMods();

    if (mods.length === 0) {
        container.appendChild(createElement("p", "empty", t("noItems")));
        return;
    }

    mods.forEach(function (mod, index) {
        container.appendChild(modCard(mod, index));
    });
}

function renderTrending() {
    const container = byId("trendingMods");
    container.replaceChildren();

    const mods = state.mods.filter(matchesGame).slice().sort(function (first, second) {
        return second.downloads - first.downloads || second.createdAt - first.createdAt;
    }).slice(0, 3);

    if (mods.length === 0) {
        container.appendChild(createElement("p", "empty", t("noItems")));
        return;
    }

    mods.forEach(function (mod, index) {
        container.appendChild(modCard(mod, index));
    });
}

function renderHomeTop() {
    const container = byId("homeTop");
    container.replaceChildren();

    state.top.slice(0, 5).forEach(function (entry, index) {
        container.appendChild(leaderRow(entry, index));
    });

    if (state.top.length === 0) {
        container.appendChild(createElement("p", "empty", t("noItems")));
    }
}

function renderActivity() {
    const container = byId("activityFeed");
    container.replaceChildren();

    const items = state.mods.filter(matchesGame).map(function (mod) {
        return { kind: "mod", time: mod.createdAt, author: mod.author, avatar: mod.authorAvatar, title: mod.name, id: mod.id };
    }).concat(state.threads.filter(matchesGame).map(function (thread) {
        return { kind: "thread", time: thread.createdAt, author: thread.author, avatar: thread.authorAvatar, title: thread.title, id: thread.id };
    })).sort(function (first, second) {
        return second.time - first.time;
    }).slice(0, 6);

    if (items.length === 0) {
        container.appendChild(createElement("p", "empty", t("noItems")));
        return;
    }

    items.forEach(function (item, index) {
        const row = reveal(createElement("div", "activity-row"), index);

        row.appendChild(userLink(item.author, item.avatar));

        const text = createElement("span", "activity-text", t(item.kind === "mod" ? "activityMod" : "activityThread") + " ");
        const target = createElement("button", "link-button", item.title);
        target.type = "button";

        target.addEventListener("click", function () {
            if (item.kind === "mod") {
                openMod(item.id);
            } else {
                navigate("forum");
            }
        });

        text.appendChild(target);
        row.appendChild(text);
        row.appendChild(createElement("small", "muted", timeAgo(item.time)));
        container.appendChild(row);
    });
}

function renderFeatured() {
    const box = byId("featuredBox");
    box.replaceChildren();

    const mod = state.featured;

    if (!mod || !matchesGame(mod)) {
        box.hidden = true;
        return;
    }

    box.hidden = false;

    const picture = createElement("div", "featured-picture");
    picture.appendChild(modImage(mod));
    box.appendChild(picture);

    const info = createElement("div", "featured-info");
    info.appendChild(createElement("span", "badge", "★ " + t("featuredTitle")));
    info.appendChild(createElement("h3", "", mod.name));
    info.appendChild(createElement("p", "", mod.description || ""));
    info.appendChild(createElement("div", "rating-line", starsText(mod.ratingAverage) + "  " + mod.ratingAverage.toFixed(1) + " (" + mod.ratingCount + ")"));

    info.appendChild(createButton(t("openMod"), "primary", function () {
        openMod(mod.id);
    }));

    box.appendChild(info);
}

function renderHome() {
    renderFeatured();
    renderStats();
    renderNewsList(byId("homeNews"), 3);
    renderPoll();
    renderTrending();
    renderHomeTop();
    renderActivity();
}

function renderNews() {
    renderNewsList(byId("newsList"));
}

function likeButton(count, liked, handler) {
    return createButton("♥ " + count, "like-button" + (liked ? " liked" : ""), handler);
}

function threadCard(thread, index) {
    const card = reveal(createElement("article", "thread" + (thread.pinned ? " pinned" : "")), index);

    const head = createElement("div", "thread-head");
    head.appendChild(userLink(thread.author, thread.authorAvatar));
    head.appendChild(createElement("small", "muted", gameNames[thread.game] + " | " + timeAgo(thread.createdAt)));

    if (thread.pinned) {
        head.appendChild(createElement("span", "badge", "📌 " + t("pinned")));
    }

    card.appendChild(head);
    card.appendChild(createElement("h4", "", thread.title));
    card.appendChild(createElement("p", "", thread.body));

    const actions = createElement("div", "thread-actions");

    actions.appendChild(likeButton(thread.likeCount, thread.liked, async function () {
        if (!state.user) {
            toast(t("loginNeeded"), "error");
            return;
        }

        await act("/api/threads/" + thread.id + "/like");
        await loadData();
    }));

    actions.appendChild(createElement("span", "muted", "💬 " + thread.replies.length + " " + t("repliesLabel")));

    if (isAdmin()) {
        actions.appendChild(createButton(thread.pinned ? t("unpin") : t("pin"), "small", async function () {
            await act("/api/threads/" + thread.id + "/pin");
            await loadData();
        }));
    }

    if (canManage(thread.author)) {
        actions.appendChild(createButton(t("delete"), "danger small", async function () {
            if (window.confirm(t("confirmDelete"))) {
                await act("/api/threads/" + thread.id, null, "DELETE");
                await loadData();
            }
        }));
    }

    card.appendChild(actions);

    thread.replies.forEach(function (reply) {
        const node = createElement("div", "reply");
        const top = createElement("div", "reply-top");

        top.appendChild(userLink(reply.author, reply.authorAvatar));
        top.appendChild(createElement("small", "muted", timeAgo(reply.createdAt)));
        node.appendChild(top);
        node.appendChild(createElement("p", "", reply.text));

        const replyActions = createElement("div", "thread-actions");

        replyActions.appendChild(likeButton(reply.likeCount, reply.liked, async function () {
            if (!state.user) {
                toast(t("loginNeeded"), "error");
                return;
            }

            await act("/api/threads/" + thread.id + "/replies/" + reply.id + "/like");
            await loadData();
        }));

        if (canManage(reply.author)) {
            replyActions.appendChild(createButton(t("delete"), "danger small", async function () {
                await act("/api/threads/" + thread.id + "/replies/" + reply.id, null, "DELETE");
                await loadData();
            }));
        }

        node.appendChild(replyActions);
        card.appendChild(node);
    });

    const form = createElement("form", "reply-form");
    const input = createElement("input");
    input.type = "text";
    input.maxLength = 300;
    input.placeholder = t("replyPlaceholder");

    const submit = createElement("button", "", t("reply"));
    submit.type = "submit";

    form.appendChild(input);
    form.appendChild(submit);

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const text = input.value.trim();

        if (!state.user) {
            navigate("account");
            return;
        }

        if (!text) {
            return;
        }

        const result = await act("/api/threads/" + thread.id + "/replies", { text: text });

        if (result) {
            await loadData();
        }
    });

    card.appendChild(form);
    return card;
}

function renderForum() {
    const container = byId("threadList");
    container.replaceChildren();

    const query = state.forumSearch.trim().toLowerCase();

    let threads = state.threads.filter(matchesGame);

    if (query) {
        threads = threads.filter(function (thread) {
            return (thread.title + " " + thread.body + " " + thread.author).toLowerCase().includes(query);
        });
    }

    threads = threads.slice().sort(function (first, second) {
        if (first.pinned !== second.pinned) {
            return first.pinned ? -1 : 1;
        }

        if (state.forumSort === "popular") {
            return second.likeCount - first.likeCount;
        }

        if (state.forumSort === "replies") {
            return second.replies.length - first.replies.length;
        }

        return second.createdAt - first.createdAt;
    });

    if (threads.length === 0) {
        container.appendChild(createElement("p", "empty", t("noItems")));
        return;
    }

    threads.forEach(function (thread, index) {
        container.appendChild(threadCard(thread, index));
    });
}

function renderChat() {
    const log = byId("chatLog");
    const nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 80;

    byId("chatChannel").textContent = t("chatTitle") + " | " + gameNames[state.chat.channel];

    log.replaceChildren();

    if (state.chat.messages.length === 0) {
        log.appendChild(createElement("p", "empty", t("noItems")));
    }

    state.chat.messages.forEach(function (message) {
        const row = createElement("div", "chat-row");
        row.appendChild(userLink(message.author, message.authorAvatar));
        row.appendChild(createElement("span", "chat-text", message.text));
        row.appendChild(createElement("small", "muted", timeAgo(message.createdAt)));
        log.appendChild(row);
    });

    if (nearBottom) {
        log.scrollTop = log.scrollHeight;
    }
}

async function loadChat(reset) {
    if (state.page !== "chat") {
        return;
    }

    if (reset || state.chat.channel !== state.game) {
        state.chat = { channel: state.game, messages: [], since: 0 };
    }

    try {
        const response = await request("/api/chat?channel=" + state.chat.channel + "&since=" + state.chat.since);
        const messages = await response.json();

        if (messages.length > 0) {
            state.chat.messages = state.chat.messages.concat(messages).slice(-150);
            state.chat.since = messages[messages.length - 1].seq;
            renderChat();
        } else if (reset) {
            renderChat();
        }
    } catch (error) {
        if (error.message !== "network") {
            console.error(error);
        }
    }
}

function startChat() {
    stopChat();
    loadChat(true);
    chatTimer = setInterval(function () {
        loadChat(false);
    }, 3500);
}

function stopChat() {
    if (chatTimer) {
        clearInterval(chatTimer);
        chatTimer = null;
    }
}

function leaderRow(entry, index) {
    const row = reveal(createElement("div", "leader-row"), index);

    row.appendChild(createElement("span", "leader-position", "#" + (index + 1)));
    row.appendChild(userLink(entry.name, entry.hasAvatar));
    row.appendChild(createElement("span", "rank-tag rank-" + entry.rank, rankNames[entry.rank]));
    row.appendChild(createElement("strong", "leader-points", entry.points + " " + t("points")));

    return row;
}

function renderTop() {
    const list = byId("topList");
    list.replaceChildren();

    state.top.forEach(function (entry, index) {
        list.appendChild(leaderRow(entry, index));
    });

    if (state.top.length === 0) {
        list.appendChild(createElement("p", "empty", t("noItems")));
    }

    const legend = byId("rankLegend");
    legend.replaceChildren();

    rankNames.forEach(function (name, index) {
        const item = createElement("div", "legend-item");
        item.appendChild(createElement("span", "rank-tag rank-" + index, name));
        item.appendChild(createElement("small", "muted", rankLimits[index] + "+ " + t("points")));
        legend.appendChild(item);
    });
}

async function renderProfile() {
    const container = byId("profileView");
    const name = state.profileName;

    if (!name) {
        container.replaceChildren();
        return;
    }

    let profile;

    try {
        const response = await request("/api/users/" + encodeURIComponent(name));
        profile = await response.json();
    } catch (error) {
        container.replaceChildren(createElement("p", "empty", t("notFound")));
        return;
    }

    if (state.profileName !== name) {
        return;
    }

    container.replaceChildren();

    const own = Boolean(state.user) && state.user.name === profile.name;
    const header = createElement("div", "panel profile-header");

    header.appendChild(avatarNode(profile.name, profile.hasAvatar, 110));

    const info = createElement("div", "profile-info");
    info.appendChild(createElement("h2", "", profile.name));

    const tags = createElement("div", "profile-tags");
    tags.appendChild(createElement("span", "rank-tag rank-" + profile.rank, rankNames[profile.rank]));

    if (profile.role === "admin") {
        tags.appendChild(createElement("span", "badge", "★ " + t("admin")));
    }

    if (profile.banned) {
        tags.appendChild(createElement("span", "badge banned", t("banned")));
    }

    info.appendChild(tags);
    info.appendChild(createElement("small", "muted", t("memberSince") + " " + formatDate(profile.createdAt)));

    const nextIndex = Math.min(profile.rank + 1, rankLimits.length - 1);
    const from = rankLimits[profile.rank];
    const to = rankLimits[nextIndex];
    const percent = to === from ? 100 : Math.min(100, Math.round(((profile.points - from) / (to - from)) * 100));

    const progress = createElement("div", "progress");
    progress.style.setProperty("--percent", percent + "%");
    info.appendChild(progress);
    info.appendChild(createElement("small", "muted", profile.points + " " + t("points") + (nextIndex !== profile.rank ? " → " + rankNames[nextIndex] + " (" + to + ")" : "")));

    header.appendChild(info);
    container.appendChild(header);

    const statsBox = createElement("div", "stats-row small-stats");

    [
        ["statMods", profile.stats.mods],
        ["statThreads", profile.stats.threads],
        ["repliesLabel", profile.stats.replies],
        ["statDownloads", profile.stats.downloads],
        ["likesLabel", profile.stats.likes]
    ].forEach(function (item, index) {
        const box = reveal(createElement("div", "stat"), index);
        box.appendChild(createElement("strong", "", String(item[1])));
        box.appendChild(createElement("span", "", t(item[0])));
        statsBox.appendChild(box);
    });

    container.appendChild(statsBox);

    const badgeBox = createElement("div", "badge-row");

    profile.badges.forEach(function (id) {
        const item = createElement("span", "achievement");
        item.title = t("badge_" + id) + ": " + t("badgeDesc_" + id);
        item.appendChild(createElement("span", "achievement-icon", badgeIcons[id]));
        item.appendChild(createElement("span", "", t("badge_" + id)));
        badgeBox.appendChild(item);
    });

    container.appendChild(badgeBox);

    if (!own && state.user) {
        const actionsBox = createElement("div", "account-actions");

        actionsBox.appendChild(createButton(t("messageUser"), "primary", function () {
            navigate("messages", profile.name);
        }));

        if (isAdmin() && profile.role !== "admin") {
            actionsBox.appendChild(createButton(profile.banned ? t("unban") : t("ban"), "danger", async function () {
                const result = await act("/api/users/" + encodeURIComponent(profile.name) + "/ban");

                if (result) {
                    renderProfile();
                }
            }));
        }

        container.appendChild(actionsBox);
    }

    const bioPanel = createElement("div", "panel");
    bioPanel.appendChild(createElement("h3", "", t("bio")));

    if (own) {
        const form = createElement("form", "bio-form");
        const area = createElement("textarea");
        area.rows = 3;
        area.maxLength = 300;
        area.value = profile.bio;
        area.placeholder = t("bioPlaceholder");

        const save = createElement("button", "primary", t("saveBio"));
        save.type = "submit";

        form.appendChild(area);
        form.appendChild(save);

        form.addEventListener("submit", async function (event) {
            event.preventDefault();
            const result = await act("/api/me/profile", { bio: area.value });

            if (result) {
                toast(t("profileSaved"), "success");
            }
        });

        bioPanel.appendChild(form);

        const label = createElement("label", "", t("changeAvatar"));
        const picker = createElement("input");
        picker.type = "file";
        picker.accept = "image/png,image/jpeg,image/webp,image/gif";

        picker.addEventListener("change", async function () {
            const file = picker.files[0];

            if (!file) {
                return;
            }

            if (file.size > 1024 * 1024) {
                toast(t("imageInvalid"), "error");
                return;
            }

            try {
                await request("/api/me/avatar", {
                    method: "POST",
                    headers: { "Content-Type": "application/octet-stream" },
                    body: file
                });

                state.avatarVersion += 1;
                await loadSession();
                renderHeader();
                renderProfile();
            } catch (error) {
                showError(error);
            }
        });

        bioPanel.appendChild(label);
        bioPanel.appendChild(picker);
    } else {
        bioPanel.appendChild(createElement("p", "", profile.bio || "..."));
    }

    container.appendChild(bioPanel);

    const mods = state.mods.filter(function (mod) {
        return mod.author === profile.name;
    });

    if (mods.length > 0) {
        container.appendChild(createElement("h3", "", t("navMods")));

        const grid = createElement("div", "mod-list");

        mods.forEach(function (mod, index) {
            grid.appendChild(modCard(mod, index));
        });

        container.appendChild(grid);
    }

    const threads = state.threads.filter(function (thread) {
        return thread.author === profile.name;
    });

    if (threads.length > 0) {
        container.appendChild(createElement("h3", "", t("navForum")));

        threads.forEach(function (thread, index) {
            container.appendChild(threadCard(thread, index));
        });
    }
}

function renderNotifications() {
    const panel = byId("notifPanel");
    panel.hidden = !state.notificationsOpen;

    if (!state.notificationsOpen) {
        return;
    }

    panel.replaceChildren();
    panel.appendChild(createElement("h4", "", t("notifications")));

    if (state.notifications.length === 0) {
        panel.appendChild(createElement("p", "empty", t("noNotifications")));
        return;
    }

    state.notifications.forEach(function (item) {
        const row = createElement("button", "notif-row" + (item.read ? "" : " unread"));
        row.type = "button";

        const text = item.from + " " + t(item.type === "reply" ? "notifReply" : "notifComment") + " «" + item.text + "»";
        row.appendChild(createElement("span", "", text));
        row.appendChild(createElement("small", "muted", timeAgo(item.createdAt)));

        row.addEventListener("click", function () {
            state.notificationsOpen = false;
            renderNotifications();

            if (item.type === "reply") {
                navigate("forum");
            } else {
                openMod(item.ref);
            }
        });

        panel.appendChild(row);
    });
}

async function toggleNotifications() {
    state.notificationsOpen = !state.notificationsOpen;

    if (state.notificationsOpen) {
        try {
            const response = await request("/api/notifications");
            state.notifications = await response.json();
        } catch (error) {
            showError(error);
        }

        renderNotifications();

        if (state.unread > 0) {
            await act("/api/notifications/read");
            state.unread = 0;
            renderHeader();
        }
    } else {
        renderNotifications();
    }
}

function closeModal() {
    state.openModId = null;
    byId("modal").hidden = true;
    document.body.classList.remove("modal-open");
}

async function openMod(modId) {
    state.openModId = modId;
    byId("modal").hidden = false;
    document.body.classList.add("modal-open");
    await renderModal();
}

async function renderModal() {
    if (!state.openModId) {
        return;
    }

    let data;

    try {
        const response = await request("/api/mods/" + state.openModId);
        data = await response.json();
    } catch (error) {
        closeModal();
        showError(error);
        return;
    }

    const mod = data.mod;
    const content = byId("modalContent");
    content.replaceChildren();

    const picture = createElement("div", "modal-picture");
    const mainImage = modImage(mod);
    picture.appendChild(mainImage);
    picture.appendChild(createElement("span", "mod-tag", gameNames[mod.game]));
    content.appendChild(picture);

    if (mod.gallery.length > 0 || canManage(mod.author)) {
        const strip = createElement("div", "gallery-strip");

        const addThumb = function (source, onDelete) {
            const wrapper = createElement("div", "thumb");
            const image = createElement("img");

            image.alt = mod.name;
            image.src = source;

            image.addEventListener("click", function () {
                mainImage.src = source;
            });

            wrapper.appendChild(image);

            if (onDelete) {
                wrapper.appendChild(createButton("✕", "thumb-delete", onDelete));
            }

            strip.appendChild(wrapper);
        };

        addThumb(mainImage.src, null);

        mod.gallery.forEach(function (galleryId) {
            const remove = canManage(mod.author) ? async function () {
                await act("/api/mods/" + mod.id + "/gallery/" + galleryId, null, "DELETE");
                await loadData();
                await renderModal();
            } : null;

            addThumb("/api/mods/" + mod.id + "/gallery/" + galleryId, remove);
        });

        if (canManage(mod.author) && mod.gallery.length < 4) {
            const label = createElement("label", "thumb add", "+ " + t("addScreenshot"));
            const picker = createElement("input");

            picker.type = "file";
            picker.accept = "image/png,image/jpeg,image/webp,image/gif";

            picker.addEventListener("change", async function () {
                const file = picker.files[0];

                if (!file) {
                    return;
                }

                if (file.size > maxImageSize) {
                    toast(t("imageInvalid"), "error");
                    return;
                }

                try {
                    await request("/api/mods/" + mod.id + "/gallery", {
                        method: "POST",
                        headers: { "Content-Type": "application/octet-stream" },
                        body: file
                    });

                    await loadData();
                    await renderModal();
                } catch (error) {
                    showError(error);
                }
            });

            label.appendChild(picker);
            strip.appendChild(label);
        }

        content.appendChild(strip);
    }

    const body = createElement("div", "modal-body");
    body.appendChild(createElement("h2", "", mod.name));

    const meta = createElement("div", "modal-meta");
    meta.appendChild(userLink(mod.author, mod.authorAvatar));
    meta.appendChild(createElement("small", "muted", formatSize(mod.size) + " | " + mod.downloads + " " + t("downloads") + " | " + formatDate(mod.createdAt)));
    body.appendChild(meta);

    body.appendChild(createElement("p", "modal-description", mod.description || "..."));

    const ratingBox = createElement("div", "rating-box");
    const shown = mod.myRating || Math.round(mod.ratingAverage);
    const stars = createElement("div", "stars");

    for (let value = 1; value <= 5; value++) {
        stars.appendChild(createButton("★", "star" + (value <= shown ? " on" : ""), async function () {
            if (!state.user) {
                toast(t("loginNeeded"), "error");
                return;
            }

            const result = await act("/api/mods/" + mod.id + "/rate", { stars: value });

            if (result) {
                await loadData();
                await renderModal();
            }
        }));
    }

    ratingBox.appendChild(stars);
    ratingBox.appendChild(createElement("span", "", mod.ratingAverage.toFixed(1) + " (" + mod.ratingCount + ")" + (mod.myRating ? "  |  " + t("yourRating") + ": " + mod.myRating : "")));
    body.appendChild(ratingBox);

    const actions = createElement("div", "mod-actions");
    const isInstalled = state.installedMods.includes(mod.id);

    actions.appendChild(createButton(isInstalled ? t("installed") + " | " + t("uninstall") : t("install"), isInstalled ? "installed" : "", function () {
        if (isInstalled) {
            uninstallMod(mod);
        } else {
            installMod(mod);
        }
    }));

    const downloadLink = createElement("a", "", t("download"));
    downloadLink.href = "/api/mods/" + mod.id + "/file";
    actions.appendChild(downloadLink);

    actions.appendChild(createButton(mod.favorite ? "♥ " + t("unfavorite") : "♡ " + t("favorite"), "outline", async function () {
        if (!state.user) {
            toast(t("loginNeeded"), "error");
            return;
        }

        await act("/api/mods/" + mod.id + "/favorite");
        await loadData();
        await renderModal();
    }));

    if (canManage(mod.author)) {
        actions.appendChild(createButton(t("delete"), "danger", async function () {
            if (window.confirm(t("confirmDelete"))) {
                const result = await act("/api/mods/" + mod.id, null, "DELETE");

                if (result) {
                    closeModal();
                    await loadData();
                }
            }
        }));
    }

    if (isAdmin()) {
        const isFeatured = Boolean(state.featured) && state.featured.id === mod.id;

        actions.appendChild(createButton(isFeatured ? t("unfeature") : t("feature"), "outline", async function () {
            const result = await act("/api/mods/" + mod.id + "/feature");

            if (result) {
                await loadData();
                await renderModal();
            }
        }));
    }

    body.appendChild(actions);
    body.appendChild(createElement("h3", "", t("comments") + " (" + data.comments.length + ")"));

    data.comments.forEach(function (comment) {
        const row = createElement("div", "comment");
        const top = createElement("div", "reply-top");

        top.appendChild(userLink(comment.author, comment.authorAvatar));
        top.appendChild(createElement("small", "muted", timeAgo(comment.createdAt)));

        if (canManage(comment.author)) {
            top.appendChild(createButton(t("delete"), "danger small", async function () {
                await act("/api/mods/" + mod.id + "/comments/" + comment.id, null, "DELETE");
                await loadData();
                await renderModal();
            }));
        }

        row.appendChild(top);
        row.appendChild(createElement("p", "", comment.text));
        body.appendChild(row);
    });

    const form = createElement("form", "reply-form");
    const input = createElement("input");
    input.type = "text";
    input.maxLength = 400;
    input.placeholder = t("writeComment");

    const submit = createElement("button", "", t("send"));
    submit.type = "submit";

    form.appendChild(input);
    form.appendChild(submit);

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        if (!state.user) {
            toast(t("loginNeeded"), "error");
            return;
        }

        const text = input.value.trim();

        if (!text) {
            return;
        }

        const result = await act("/api/mods/" + mod.id + "/comments", { text: text });

        if (result) {
            await loadData();
            await renderModal();
        }
    });

    body.appendChild(form);
    content.appendChild(body);
}

function startMessages() {
    stopMessages();
    loadMessages();
    messageTimer = setInterval(loadMessages, 4000);
}

function stopMessages() {
    if (messageTimer) {
        clearInterval(messageTimer);
        messageTimer = null;
    }
}

async function loadMessages() {
    if (state.page !== "messages" || !state.user) {
        renderMessages();
        return;
    }

    try {
        const listResponse = await request("/api/messages");
        state.conversations = await listResponse.json();

        if (state.messageWith) {
            const threadResponse = await request("/api/messages/" + encodeURIComponent(state.messageWith));
            state.thread = await threadResponse.json();
        } else {
            state.thread = [];
        }

        renderMessages();
        await loadSession();
        renderHeader();
    } catch (error) {
        if (error.message === "notfound") {
            state.messageWith = null;
            state.thread = [];
            renderMessages();
        } else if (error.message !== "network") {
            console.error(error);
        }
    }
}

function renderMessages() {
    const list = byId("conversationList");
    list.replaceChildren();

    const form = byId("messageForm");
    const log = byId("messageLog");

    if (!state.user) {
        list.appendChild(createElement("p", "empty", t("loginNeeded")));
        form.style.display = "none";
        log.replaceChildren();
        byId("messageWith").textContent = "";
        return;
    }

    state.conversations.forEach(function (entry) {
        const row = createElement("button", "conversation" + (state.messageWith === entry.name ? " active" : ""));
        row.type = "button";
        row.appendChild(avatarNode(entry.name, entry.hasAvatar, 36));

        const text = createElement("span", "conversation-text");
        text.appendChild(createElement("strong", "", entry.name));
        text.appendChild(createElement("small", "muted", entry.last));
        row.appendChild(text);

        if (entry.unread > 0) {
            row.appendChild(createElement("span", "badge-count inline", String(entry.unread)));
        }

        row.addEventListener("click", function () {
            navigate("messages", entry.name);
        });

        list.appendChild(row);
    });

    if (state.conversations.length === 0) {
        list.appendChild(createElement("p", "empty", t("noConversations")));
    }

    byId("messageWith").textContent = state.messageWith || t("selectConversation");
    form.style.display = state.messageWith ? "flex" : "none";

    const nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 80;

    log.replaceChildren();

    state.thread.forEach(function (message) {
        const mine = message.from === state.user.name;
        const bubble = createElement("div", "bubble " + (mine ? "mine" : "theirs"));
        bubble.appendChild(createElement("span", "", message.text));
        bubble.appendChild(createElement("small", "muted", timeAgo(message.createdAt)));
        log.appendChild(bubble);
    });

    if (nearBottom || state.thread.length < 3) {
        log.scrollTop = log.scrollHeight;
    }
}

async function handleMessage(event) {
    event.preventDefault();

    const input = byId("messageInput");
    const text = input.value.trim();

    if (!text || !state.messageWith) {
        return;
    }

    input.value = "";

    const result = await act("/api/messages/" + encodeURIComponent(state.messageWith), { text: text });

    if (result) {
        await loadMessages();
    }
}

function bfg() {
    document.body.classList.add("bfg");
    playSound("boom");
    toast(t("konami"), "success");

    setTimeout(function () {
        document.body.classList.remove("bfg");
    }, 1500);
}

function handleKeys(event) {
    if (event.key === "Escape") {
        closeModal();
        return;
    }

    const active = document.activeElement;
    const typing = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.tagName === "SELECT");

    if (typing) {
        konamiIndex = 0;
        return;
    }

    if (event.key === "/" && (state.page === "mods" || state.page === "forum")) {
        event.preventDefault();
        byId(state.page === "mods" ? "modSearch" : "forumSearch").focus();
        return;
    }

    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

    if (key === konamiCode[konamiIndex]) {
        konamiIndex += 1;

        if (konamiIndex === konamiCode.length) {
            konamiIndex = 0;
            bfg();
        }
    } else {
        konamiIndex = key === konamiCode[0] ? 1 : 0;
    }
}

function renderCurrent() {
    renderHeader();

    if (state.page === "home") {
        renderHome();
    } else if (state.page === "news") {
        renderNews();
    } else if (state.page === "mods") {
        renderMods();
    } else if (state.page === "forum") {
        renderForum();
    } else if (state.page === "chat") {
        renderChat();
    } else if (state.page === "top") {
        renderTop();
    } else if (state.page === "messages") {
        renderMessages();
    } else if (state.page === "profile") {
        renderProfile();
    }

    renderNotifications();
}

function renderFresh() {
    animateCards = true;
    renderCurrent();
    animateCards = false;
}

async function loadSession() {
    if (!state.token) {
        state.user = null;
        state.unread = 0;
        return;
    }

    try {
        const response = await request("/api/me");
        const profile = await response.json();
        const previous = state.unread;

        const previousMessages = state.unreadMessages;

        state.user = profile;
        state.unread = profile.unread;
        state.unreadMessages = profile.unreadMessages || 0;

        if (state.unreadMessages > previousMessages && state.page !== "messages") {
            toast(t("newMessages") + ": " + state.unreadMessages, "info");
        }

        if (state.unread > previous && previous !== null) {
            toast(t("notifications") + ": " + state.unread, "info");
        }
    } catch (error) {
        if (error.message !== "network") {
            state.token = null;
            state.user = null;
            storage.write("fh_token", null);
        }
    }
}

async function loadData() {
    try {
        const paths = ["/api/threads", "/api/mods", "/api/news", "/api/poll", "/api/stats", "/api/top"];
        const responses = await Promise.all(paths.map(function (path) {
            return request(path);
        }));
        const results = await Promise.all(responses.map(function (response) {
            return response.json();
        }));

        state.threads = results[0];
        state.mods = results[1];
        state.news = results[2];
        state.poll = results[3];
        state.stats = results[4];
        state.featured = results[4].featured || null;
        state.top = results[5];

        renderCurrent();
    } catch (error) {
        showError(error);
    }
}

function parseHash() {
    const parts = window.location.hash.replace("#", "").split("/");
    const name = validPages.includes(parts[0]) ? parts[0] : "home";
    const param = parts[1] ? decodeURIComponent(parts[1]) : null;

    return { name: name, param: param };
}

function navigate(name, param) {
    const hash = name + (param ? "/" + encodeURIComponent(param) : "");

    if (window.location.hash.replace("#", "") === hash) {
        display(name, param);
    } else {
        window.location.hash = hash;
    }
}

function display(name, param) {
    state.page = name;
    state.profileName = name === "profile" ? param : null;
    state.messageWith = name === "messages" ? param : null;
    state.notificationsOpen = false;

    document.querySelectorAll(".page").forEach(function (section) {
        section.classList.toggle("active", section.id === "page-" + name);
    });

    document.querySelectorAll("#mainNav button").forEach(function (button) {
        button.classList.toggle("active", button.dataset.page === name);
    });

    window.scrollTo({ top: 0 });
    renderFresh();

    if (name === "chat") {
        startChat();
    } else {
        stopChat();
    }

    if (name === "messages") {
        startMessages();
    } else {
        stopMessages();
    }

    loadData();
}

function setGame(game, silent) {
    state.game = game;
    document.body.dataset.game = game;

    document.querySelectorAll("#gameDock button").forEach(function (button) {
        button.classList.toggle("active", button.dataset.game === game);
    });

    if (!silent) {
        const flash = byId("flash");
        flash.classList.remove("go");
        void flash.offsetWidth;
        flash.classList.add("go");

        playSound("boom");
    }

    renderFresh();

    const title = byId("heroTitle");
    title.classList.remove("slam");
    void title.offsetWidth;
    title.classList.add("slam");

    if (state.page === "chat") {
        loadChat(true);
    }

    window.dispatchEvent(new Event("themechange"));
}

async function handleAuth(event) {
    event.preventDefault();

    const name = byId("authUser").value.trim();
    const password = byId("authPass").value;
    const errorNode = byId("authError");

    errorNode.textContent = "";

    if (!name || !password) {
        errorNode.textContent = t("fillAll");
        return;
    }

    try {
        const response = await request(state.registerMode ? "/api/register" : "/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: name, password: password })
        });

        const data = await response.json();

        state.token = data.token;
        storage.write("fh_token", data.token);
        byId("authForm").reset();
        state.registerMode = false;

        await loadSession();
        toast(t("welcome") + data.name, "success");
        await loadData();
        navigate("home");
    } catch (error) {
        if (error.message === "network") {
            errorNode.textContent = t("serverError");
        } else {
            errorNode.textContent = t(errorKeys[error.message] || "serverError");
        }
    }
}

async function handleLogout() {
    try {
        await request("/api/logout", { method: "POST" });
    } catch (error) {
        console.error(error);
    }

    state.token = null;
    state.user = null;
    state.unread = 0;
    state.unreadMessages = 0;
    storage.write("fh_token", null);
    renderCurrent();
    navigate("home");
}

async function handlePassword(event) {
    event.preventDefault();

    const result = await act("/api/me/password", {
        oldPassword: byId("oldPassword").value,
        newPassword: byId("newPassword").value
    });

    if (result) {
        byId("passwordForm").reset();
        toast(t("passwordChanged"), "success");
    }
}

async function handleThread(event) {
    event.preventDefault();

    const title = byId("threadTitle").value.trim();
    const body = byId("threadBody").value.trim();
    const game = byId("threadGame").value;

    if (!title || !body) {
        toast(t("fillAll"), "error");
        return;
    }

    const result = await act("/api/threads", { game: game, title: title, body: body });

    if (result) {
        byId("threadForm").reset();
        await loadData();
    }
}

async function handleUpload(event) {
    event.preventDefault();

    const name = byId("uploadName").value.trim();
    const game = byId("uploadGame").value;
    const description = byId("uploadDescription").value.trim();
    const file = byId("uploadFile").files[0];
    const imageFile = byId("uploadImage").files[0];
    const submitButton = event.target.querySelector("button[type='submit']");

    if (!state.user || !name || !file) {
        toast(t("fillAll"), "error");
        return;
    }

    if (file.size > maxFileSize) {
        toast(t("fileTooBig"), "error");
        return;
    }

    if (imageFile && imageFile.size > maxImageSize) {
        toast(t("imageInvalid"), "error");
        return;
    }

    submitButton.disabled = true;

    try {
        const response = await request("/api/mods", {
            method: "POST",
            headers: {
                "Content-Type": "application/octet-stream",
                "X-Mod-Name": encodeURIComponent(name),
                "X-Mod-Game": game,
                "X-Mod-Description": encodeURIComponent(description),
                "X-File-Name": encodeURIComponent(file.name)
            },
            body: file
        });

        const created = await response.json();

        if (imageFile) {
            await request("/api/mods/" + created.id + "/image", {
                method: "POST",
                headers: { "Content-Type": "application/octet-stream" },
                body: imageFile
            });
        }

        const shots = Array.from(byId("uploadGallery").files).slice(0, 4);

        for (const shot of shots) {
            if (shot.size <= maxImageSize) {
                await request("/api/mods/" + created.id + "/gallery", {
                    method: "POST",
                    headers: { "Content-Type": "application/octet-stream" },
                    body: shot
                });
            }
        }

        byId("uploadForm").reset();
        toast(t("modUploaded"), "success");
    } catch (error) {
        showError(error);
    }

    submitButton.disabled = false;
    await loadData();
}

async function handleNews(event) {
    event.preventDefault();

    const result = await act("/api/news", {
        game: byId("newsGame").value,
        title: byId("newsTitleInput").value,
        body: byId("newsBodyInput").value,
        url: byId("newsUrlInput").value
    });

    if (result) {
        byId("newsForm").reset();
        await loadData();
    }
}

async function handlePollForm(event) {
    event.preventDefault();

    const result = await act("/api/poll", {
        question: byId("pollQuestionInput").value,
        options: byId("pollOptionsInput").value.split("\n")
    });

    if (result) {
        byId("pollForm").reset();
        await loadData();
        toast(t("publish"), "success");
    }
}

async function handleChat(event) {
    event.preventDefault();

    const input = byId("chatInput");
    const text = input.value.trim();

    if (!text) {
        return;
    }

    input.value = "";

    const result = await act("/api/chat", { channel: state.chat.channel, text: text });

    if (result) {
        await loadChat(false);
    }
}

function startEmbers() {
    const canvas = byId("embers");
    const context = canvas.getContext("2d");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let particles = [];
    let color = "#e8452c";

    function readColor() {
        color = getComputedStyle(document.body).getPropertyValue("--accent").trim() || color;
    }

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function createParticle() {
        return {
            x: Math.random() * canvas.width,
            y: canvas.height + Math.random() * 40,
            size: 1 + Math.random() * 2.5,
            speed: 0.4 + Math.random() * 1.2,
            drift: (Math.random() - 0.5) * 0.6,
            alpha: 0.3 + Math.random() * 0.6
        };
    }

    function draw() {
        context.clearRect(0, 0, canvas.width, canvas.height);

        if (particles.length < 90) {
            particles.push(createParticle());
        }

        particles.forEach(function (particle) {
            particle.y -= particle.speed;
            particle.x += particle.drift;
            particle.alpha -= 0.0016;

            context.globalAlpha = Math.max(particle.alpha, 0);
            context.fillStyle = color;
            context.fillRect(particle.x, particle.y, particle.size, particle.size);
        });

        particles = particles.filter(function (particle) {
            return particle.alpha > 0 && particle.y > -10;
        });

        context.globalAlpha = 1;
        requestAnimationFrame(draw);
    }

    resize();
    readColor();

    window.addEventListener("resize", resize);
    window.addEventListener("themechange", function () {
        setTimeout(readColor, 50);
    });

    if (!reduceMotion) {
        draw();
    }
}

function startEffects() {
    const crosshair = byId("crosshair");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let tiltNode = null;

    document.addEventListener("mousemove", function (event) {
        document.documentElement.style.setProperty("--mx", event.clientX + "px");
        document.documentElement.style.setProperty("--my", event.clientY + "px");

        if (state.crosshair) {
            crosshair.style.transform = "translate(" + event.clientX + "px, " + event.clientY + "px)";
        }

        if (reduceMotion) {
            return;
        }

        const card = event.target.closest ? event.target.closest(".tilt") : null;

        if (tiltNode && tiltNode !== card) {
            tiltNode.style.setProperty("--rx", "0deg");
            tiltNode.style.setProperty("--ry", "0deg");
        }

        tiltNode = card;

        if (!card) {
            return;
        }

        const box = card.getBoundingClientRect();
        const x = (event.clientX - box.left) / box.width - 0.5;
        const y = (event.clientY - box.top) / box.height - 0.5;

        card.style.setProperty("--ry", (x * 7).toFixed(2) + "deg");
        card.style.setProperty("--rx", (-y * 7).toFixed(2) + "deg");
    });

    document.addEventListener("mousedown", function () {
        if (!state.crosshair) {
            return;
        }

        crosshair.classList.remove("shot");
        void crosshair.offsetWidth;
        crosshair.classList.add("shot");
        playSound("click");
    });
}

function refreshLoop() {
    setInterval(async function () {
        if (document.hidden) {
            return;
        }

        await loadSession();
        renderHeader();

        const active = document.activeElement;
        const typing = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA");

        if (!typing && state.openModId === null) {
            await loadData();
        }
    }, 20000);
}

async function init() {
    document.addEventListener("click", function (event) {
        const pageButton = event.target.closest("[data-page]");

        if (pageButton) {
            navigate(pageButton.dataset.page);
        }

        if (!event.target.closest("#notifPanel") && !event.target.closest("#bellButton") && state.notificationsOpen) {
            state.notificationsOpen = false;
            renderNotifications();
        }
    });

    document.addEventListener("keydown", handleKeys);

    byId("gameDock").addEventListener("click", function (event) {
        const button = event.target.closest("button[data-game]");

        if (button) {
            setGame(button.dataset.game);
        }
    });

    byId("langSelect").addEventListener("change", function (event) {
        state.language = event.target.value;
        storage.write("fh_language", state.language);
        renderCurrent();
        renderModal();
    });

    byId("authToggle").addEventListener("click", function () {
        state.registerMode = !state.registerMode;
        byId("authError").textContent = "";
        renderHeader();
    });

    byId("soundButton").addEventListener("click", function () {
        state.sound = !state.sound;
        storage.write("fh_sound", state.sound);
        renderHeader();
        playSound("click");
    });

    byId("crosshairButton").addEventListener("click", function () {
        state.crosshair = !state.crosshair;
        storage.write("fh_crosshair", state.crosshair);
        renderHeader();
    });

    byId("bellButton").addEventListener("click", toggleNotifications);

    byId("messageButton").addEventListener("click", function () {
        navigate("messages");
    });

    byId("messageForm").addEventListener("submit", handleMessage);
    byId("modalClose").addEventListener("click", closeModal);

    byId("modal").addEventListener("click", function (event) {
        if (event.target === byId("modal")) {
            closeModal();
        }
    });

    byId("folderButton").addEventListener("click", async function () {
        if (!window.showDirectoryPicker) {
            toast(t("installedDownload"), "info");
            return;
        }

        await pickFolder();
    });

    byId("modSearch").addEventListener("input", function (event) {
        state.modSearch = event.target.value;
        renderFresh();
    });

    byId("modSort").addEventListener("change", function (event) {
        state.modSort = event.target.value;
        renderFresh();
    });

    byId("favoritesToggle").addEventListener("click", function () {
        state.onlyFavorites = !state.onlyFavorites;
        byId("favoritesToggle").classList.toggle("on", state.onlyFavorites);
        renderFresh();
    });

    byId("forumSearch").addEventListener("input", function (event) {
        state.forumSearch = event.target.value;
        renderFresh();
    });

    byId("forumSort").addEventListener("change", function (event) {
        state.forumSort = event.target.value;
        renderFresh();
    });

    byId("authForm").addEventListener("submit", handleAuth);
    byId("logoutButton").addEventListener("click", handleLogout);
    byId("passwordForm").addEventListener("submit", handlePassword);
    byId("threadForm").addEventListener("submit", handleThread);
    byId("uploadForm").addEventListener("submit", handleUpload);
    byId("newsForm").addEventListener("submit", handleNews);
    byId("pollForm").addEventListener("submit", handlePollForm);
    byId("chatForm").addEventListener("submit", handleChat);

    byId("profileLink").addEventListener("click", function () {
        if (state.user) {
            navigate("profile", state.user.name);
        }
    });

    window.addEventListener("hashchange", function () {
        const target = parseHash();
        display(target.name, target.param);
    });

    startEmbers();
    startEffects();

    await loadSession();

    const target = parseHash();
    display(target.name, target.param);
    setGame("all", true);

    await loadData();
    refreshLoop();
}

init();
`

};


const staticFiles = {
    "/": { content: pages.html, type: "text/html; charset=utf-8" },
    "/index.html": { content: pages.html, type: "text/html; charset=utf-8" },
    "/style.css": { content: pages.css, type: "text/css; charset=utf-8" },
    "/script.js": { content: pages.script, type: "text/javascript; charset=utf-8" },
    "/translations.js": { content: pages.translations, type: "text/javascript; charset=utf-8" }
};

Object.values(staticFiles).forEach(function (entry) {
    entry.body = Buffer.from(entry.content, "utf-8");
    entry.gzip = zlib.gzipSync(entry.body);
});

fs.mkdirSync(filesDirectory, { recursive: true });

let database = {
    users: [],
    sessions: {},
    threads: [],
    mods: [],
    chat: [],
    chatSeq: 0,
    news: [],
    poll: null,
    messages: [],
    featuredMod: null
};

if (fs.existsSync(databaseFile)) {
    database = Object.assign(database, JSON.parse(fs.readFileSync(databaseFile, "utf-8")));
}

function newId() {
    return crypto.randomBytes(8).toString("hex");
}

function normalizeDatabase() {
    database.users.forEach(function (user, index) {
        user.id = user.id || newId();
        user.role = user.role || (index === 0 ? "admin" : "user");
        user.bio = user.bio || "";
        user.createdAt = user.createdAt || Date.now();
        user.favorites = user.favorites || [];
        user.notifications = user.notifications || [];
        user.avatarType = user.avatarType || null;
        user.banned = Boolean(user.banned);
    });

    database.mods.forEach(function (mod) {
        mod.description = mod.description || "";
        mod.downloads = mod.downloads || 0;
        mod.ratings = Array.isArray(mod.ratings) ? mod.ratings : [];
        mod.comments = mod.comments || [];
        mod.gallery = mod.gallery || [];
    });

    database.threads.forEach(function (thread) {
        thread.likes = thread.likes || [];
        thread.pinned = Boolean(thread.pinned);

        thread.replies.forEach(function (reply) {
            reply.id = reply.id || newId();
            reply.likes = reply.likes || [];
        });
    });
}

normalizeDatabase();

const lastSeen = new Map();
const buckets = new Map();

function saveDatabase() {
    const temporary = databaseFile + ".tmp";
    fs.writeFileSync(temporary, JSON.stringify(database));
    fs.renameSync(temporary, databaseFile);
}

function clientAddress(request) {
    const direct = request.socket.remoteAddress || "unknown";
    const loopback = direct === "127.0.0.1" || direct === "::1" || direct === "::ffff:127.0.0.1";
    const forwarded = request.headers["cf-connecting-ip"] || String(request.headers["x-forwarded-for"] || "").split(",")[0].trim();

    const hosted = Boolean(process.env.PORT);

    return (loopback || hosted) && forwarded ? forwarded : direct;
}

function limited(request, key, max, windowMs) {
    const id = key + ":" + clientAddress(request);
    const now = Date.now();
    const bucket = buckets.get(id) || { start: now, count: 0 };

    if (now - bucket.start > windowMs) {
        bucket.start = now;
        bucket.count = 0;
    }

    bucket.count += 1;
    buckets.set(id, bucket);

    return bucket.count > max;
}

setInterval(function () {
    const cutoff = Date.now() - 15 * 60 * 1000;

    buckets.forEach(function (bucket, id) {
        if (bucket.start < cutoff) {
            buckets.delete(id);
        }
    });
}, 10 * 60 * 1000).unref();

function sendJson(response, status, data) {
    const body = JSON.stringify(data);

    response.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": Buffer.byteLength(body),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
    });

    response.end(body);
}

function sendError(response, status, code) {
    sendJson(response, status, { error: code });
}

function clean(value, max) {
    return String(value || "").trim().slice(0, max);
}

function safeDecode(value) {
    try {
        return decodeURIComponent(String(value || ""));
    } catch (error) {
        return "";
    }
}

function sanitizeFileName(name) {
    const base = path.basename(name).replace(/[^\w.\- ()]/g, "_").slice(0, 100);
    return base || "mod.bin";
}

function hashPassword(password, salt) {
    return crypto.scryptSync(password, salt, 64).toString("hex");
}

function passwordMatches(user, password) {
    const attempt = Buffer.from(hashPassword(String(password || "").slice(0, 64), user.salt), "hex");
    return crypto.timingSafeEqual(attempt, Buffer.from(user.hash, "hex"));
}

function toggleIn(list, value) {
    const index = list.indexOf(value);

    if (index === -1) {
        list.push(value);
        return true;
    }

    list.splice(index, 1);
    return false;
}

function readJson(request, limit) {
    return new Promise(function (resolve, reject) {
        const chunks = [];
        let size = 0;
        let tooLarge = false;

        request.on("data", function (chunk) {
            if (tooLarge) {
                return;
            }

            size += chunk.length;

            if (size > limit) {
                tooLarge = true;
                reject(new Error("size"));
                return;
            }

            chunks.push(chunk);
        });

        request.on("end", function () {
            if (tooLarge) {
                return;
            }

            try {
                resolve(JSON.parse(Buffer.concat(chunks).toString("utf-8") || "{}"));
            } catch (error) {
                reject(new Error("fill"));
            }
        });

        request.on("error", reject);
    });
}

function readBuffer(request, limit) {
    return new Promise(function (resolve, reject) {
        const chunks = [];
        let size = 0;
        let tooLarge = false;

        request.on("data", function (chunk) {
            if (tooLarge) {
                return;
            }

            size += chunk.length;

            if (size > limit) {
                tooLarge = true;
                reject(new Error("image"));
                return;
            }

            chunks.push(chunk);
        });

        request.on("end", function () {
            if (!tooLarge) {
                resolve(Buffer.concat(chunks));
            }
        });

        request.on("error", reject);
    });
}

function detectImageType(buffer) {
    if (buffer.length < 12) {
        return null;
    }

    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
        return "image/png";
    }

    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return "image/jpeg";
    }

    if (buffer.toString("ascii", 0, 4) === "GIF8") {
        return "image/gif";
    }

    if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
        return "image/webp";
    }

    return null;
}

function findUser(name) {
    const lower = String(name || "").toLowerCase();

    return database.users.find(function (user) {
        return user.name.toLowerCase() === lower;
    });
}

function isAdmin(name) {
    const user = findUser(name);
    return Boolean(user) && user.role === "admin";
}

function hasAvatar(name) {
    const user = findUser(name);
    return Boolean(user) && Boolean(user.avatarType);
}

function getToken(request) {
    return (request.headers.authorization || "").replace("Bearer ", "");
}

function getSessionUser(request) {
    const token = getToken(request);

    if (!Object.prototype.hasOwnProperty.call(database.sessions, token)) {
        return null;
    }

    const user = findUser(database.sessions[token]);

    if (!user) {
        return null;
    }

    lastSeen.set(user.name, Date.now());
    return user.name;
}

function createSession(name) {
    const token = crypto.randomBytes(24).toString("hex");
    database.sessions[token] = name;
    saveDatabase();
    return token;
}

function notify(name, data) {
    const user = findUser(name);

    if (!user) {
        return;
    }

    user.notifications.unshift(Object.assign({ id: newId(), createdAt: Date.now(), read: false }, data));
    user.notifications = user.notifications.slice(0, 50);
}

function userStats(name) {
    const stats = { mods: 0, downloads: 0, threads: 0, replies: 0, likes: 0 };

    database.mods.forEach(function (mod) {
        if (mod.author === name) {
            stats.mods += 1;
            stats.downloads += mod.downloads;
        }
    });

    database.threads.forEach(function (thread) {
        if (thread.author === name) {
            stats.threads += 1;
            stats.likes += thread.likes.length;
        }

        thread.replies.forEach(function (reply) {
            if (reply.author === name) {
                stats.replies += 1;
                stats.likes += reply.likes.length;
            }
        });
    });

    return stats;
}

function pointsOf(stats) {
    return stats.mods * 10 + Math.floor(stats.downloads / 5) + stats.threads * 3 + stats.replies + stats.likes;
}

function rankIndex(points) {
    let index = 0;

    rankLimits.forEach(function (limit, position) {
        if (points >= limit) {
            index = position;
        }
    });

    return index;
}

function badgesOf(user, stats, points) {
    const list = [];

    if (stats.threads >= 1) {
        list.push("talker");
    }

    if (stats.replies >= 10) {
        list.push("chatterbox");
    }

    if (stats.mods >= 1) {
        list.push("modder");
    }

    if (stats.mods >= 5) {
        list.push("prolific");
    }

    if (stats.downloads >= 50) {
        list.push("popular");
    }

    if (stats.likes >= 10) {
        list.push("loved");
    }

    if (Date.now() - user.createdAt >= 30 * 86400000) {
        list.push("veteran");
    }

    if (points >= 150) {
        list.push("slayer");
    }

    if (user.role === "admin") {
        list.push("admin");
    }

    return list;
}

function profileOf(user) {
    const stats = userStats(user.name);
    const points = pointsOf(stats);

    return {
        name: user.name,
        role: user.role,
        bio: user.bio,
        createdAt: user.createdAt,
        hasAvatar: Boolean(user.avatarType),
        points: points,
        rank: rankIndex(points),
        stats: stats,
        banned: user.banned,
        badges: badgesOf(user, stats, points)
    };
}

function findMod(id) {
    return database.mods.find(function (mod) {
        return mod.id === id;
    });
}

function findThread(id) {
    return database.threads.find(function (thread) {
        return thread.id === id;
    });
}

function publicMod(mod, viewer) {
    const count = mod.ratings.length;
    const sum = mod.ratings.reduce(function (total, item) {
        return total + item.stars;
    }, 0);

    const mine = viewer ? mod.ratings.find(function (item) {
        return item.user === viewer;
    }) : null;

    const viewerRecord = viewer ? findUser(viewer) : null;

    return {
        id: mod.id,
        game: mod.game,
        name: mod.name,
        description: mod.description,
        author: mod.author,
        authorAvatar: hasAvatar(mod.author),
        fileName: mod.fileName,
        size: mod.size,
        createdAt: mod.createdAt,
        downloads: mod.downloads,
        hasImage: Boolean(mod.imageType),
        ratingAverage: count ? Math.round((sum / count) * 10) / 10 : 0,
        ratingCount: count,
        myRating: mine ? mine.stars : 0,
        favorite: viewerRecord ? viewerRecord.favorites.includes(mod.id) : false,
        commentCount: mod.comments.length,
        gallery: mod.gallery.map(function (item) {
            return item.id;
        })
    };
}

function publicComment(comment) {
    return {
        id: comment.id,
        author: comment.author,
        authorAvatar: hasAvatar(comment.author),
        text: comment.text,
        createdAt: comment.createdAt
    };
}

function publicThread(thread, viewer) {
    return {
        id: thread.id,
        game: thread.game,
        title: thread.title,
        body: thread.body,
        author: thread.author,
        authorAvatar: hasAvatar(thread.author),
        createdAt: thread.createdAt,
        pinned: thread.pinned,
        likeCount: thread.likes.length,
        liked: Boolean(viewer) && thread.likes.includes(viewer),
        replies: thread.replies.map(function (reply) {
            return {
                id: reply.id,
                author: reply.author,
                authorAvatar: hasAvatar(reply.author),
                text: reply.text,
                createdAt: reply.createdAt,
                likeCount: reply.likes.length,
                liked: Boolean(viewer) && reply.likes.includes(viewer)
            };
        })
    };
}

function publicPoll(viewer) {
    const poll = database.poll;

    if (!poll) {
        return null;
    }

    const mine = viewer ? poll.votes.find(function (vote) {
        return vote.user === viewer;
    }) : null;

    return {
        question: poll.question,
        total: poll.votes.length,
        myVote: mine ? mine.option : -1,
        options: poll.options.map(function (text, index) {
            return {
                text: text,
                votes: poll.votes.filter(function (vote) {
                    return vote.option === index;
                }).length
            };
        })
    };
}

function serveStatic(request, response, entry) {
    const accepts = String(request.headers["accept-encoding"] || "").includes("gzip");
    const body = accepts ? entry.gzip : entry.body;

    const headers = {
        "Content-Type": entry.type,
        "Content-Length": body.length,
        "X-Content-Type-Options": "nosniff",
        "Vary": "Accept-Encoding"
    };

    if (accepts) {
        headers["Content-Encoding"] = "gzip";
    }

    response.writeHead(200, headers);
    response.end(body);
}

function sendStoredImage(response, filePath, type) {
    fs.readFile(filePath, function (error, content) {
        if (error) {
            sendError(response, 404, "notfound");
            return;
        }

        response.writeHead(200, {
            "Content-Type": type,
            "Content-Length": content.length,
            "Cache-Control": "public, max-age=60",
            "X-Content-Type-Options": "nosniff"
        });

        response.end(content);
    });
}

function receiveMod(request, response, user) {
    const name = clean(safeDecode(request.headers["x-mod-name"]), 60);
    const description = clean(safeDecode(request.headers["x-mod-description"]), 400);
    const game = request.headers["x-mod-game"];
    const fileName = sanitizeFileName(safeDecode(request.headers["x-file-name"]));
    const declared = Number(request.headers["content-length"] || 0);

    if (!name || !validGames.includes(game)) {
        request.resume();
        sendError(response, 400, "fill");
        return;
    }

    if (declared > maxFileSize) {
        request.resume();
        sendError(response, 413, "size");
        return;
    }

    const id = newId();
    const target = path.join(filesDirectory, id);
    const output = fs.createWriteStream(target);
    let received = 0;
    let rejected = false;

    function reject(status, code) {
        if (rejected) {
            return;
        }

        rejected = true;
        request.unpipe(output);
        request.resume();
        output.destroy();
        fs.unlink(target, function () { });
        sendError(response, status, code);
    }

    request.on("data", function (chunk) {
        received += chunk.length;

        if (received > maxFileSize) {
            reject(413, "size");
        }
    });

    output.on("error", function () {
        reject(500, "server");
    });

    output.on("finish", function () {
        if (rejected) {
            return;
        }

        if (received === 0) {
            reject(400, "fill");
            return;
        }

        database.mods.push({
            id: id,
            game: game,
            name: name,
            description: description,
            author: user,
            fileName: fileName,
            size: received,
            createdAt: Date.now(),
            downloads: 0,
            ratings: [],
            comments: [],
            gallery: []
        });

        saveDatabase();
        sendJson(response, 200, { id: id });
    });

    request.pipe(output);
}

const routes = [];

function add(method, pattern, handler, options) {
    routes.push({
        method: method,
        regex: new RegExp("^" + pattern + "$"),
        handler: handler,
        options: options || {}
    });
}

const authLimit = { limit: "auth", max: 30, window: 600000 };

add("GET", "/api/stats", function (ctx) {
    const cutoff = Date.now() - 5 * 60 * 1000;
    let online = 0;
    let replies = 0;
    let downloads = 0;

    lastSeen.forEach(function (time) {
        if (time > cutoff) {
            online += 1;
        }
    });

    database.threads.forEach(function (thread) {
        replies += thread.replies.length;
    });

    database.mods.forEach(function (mod) {
        downloads += mod.downloads;
    });

    sendJson(ctx.response, 200, {
        users: database.users.length,
        mods: database.mods.length,
        threads: database.threads.length,
        replies: replies,
        downloads: downloads,
        online: online,
        featured: findMod(database.featuredMod) ? publicMod(findMod(database.featuredMod), ctx.user) : null
    });
});

add("POST", "/api/register", async function (ctx) {
    const body = await readJson(ctx.request, 2000);
    const name = clean(body.name, 24);
    const password = String(body.password || "");

    if (!/^[\p{L}\p{N}_-]{3,24}$/u.test(name)) {
        sendError(ctx.response, 400, "name");
        return;
    }

    if (password.length < 6 || password.length > 64) {
        sendError(ctx.response, 400, "weak");
        return;
    }

    if (findUser(name)) {
        sendError(ctx.response, 409, "exists");
        return;
    }

    const salt = crypto.randomBytes(16).toString("hex");

    database.users.push({
        id: newId(),
        name: name,
        salt: salt,
        hash: hashPassword(password, salt),
        role: database.users.length === 0 ? "admin" : "user",
        bio: "",
        createdAt: Date.now(),
        favorites: [],
        notifications: [],
        avatarType: null
    });

    sendJson(ctx.response, 200, { token: createSession(name), name: name });
}, authLimit);

add("POST", "/api/login", async function (ctx) {
    const body = await readJson(ctx.request, 2000);
    const user = findUser(clean(body.name, 24));

    if (!user || !passwordMatches(user, body.password)) {
        sendError(ctx.response, 401, "wrong");
        return;
    }

    sendJson(ctx.response, 200, { token: createSession(user.name), name: user.name });
}, authLimit);

add("POST", "/api/logout", function (ctx) {
    delete database.sessions[getToken(ctx.request)];
    saveDatabase();
    sendJson(ctx.response, 200, { ok: true });
});

add("GET", "/api/me", function (ctx) {
    const user = findUser(ctx.user);
    const profile = profileOf(user);

    profile.unread = user.notifications.filter(function (item) {
        return !item.read;
    }).length;
    profile.unreadMessages = unreadMessagesOf(user.name);

    sendJson(ctx.response, 200, profile);
}, { auth: true });

add("POST", "/api/me/profile", async function (ctx) {
    const body = await readJson(ctx.request, 2000);
    findUser(ctx.user).bio = clean(body.bio, 300);
    saveDatabase();
    sendJson(ctx.response, 200, { ok: true });
}, { auth: true });

add("POST", "/api/me/avatar", async function (ctx) {
    const buffer = await readBuffer(ctx.request, maxAvatarSize);
    const type = detectImageType(buffer);

    if (!type) {
        sendError(ctx.response, 400, "image");
        return;
    }

    const user = findUser(ctx.user);
    fs.writeFileSync(path.join(filesDirectory, "a-" + user.id), buffer);
    user.avatarType = type;
    saveDatabase();
    sendJson(ctx.response, 200, { ok: true });
}, { auth: true });

add("POST", "/api/me/password", async function (ctx) {
    const body = await readJson(ctx.request, 2000);
    const user = findUser(ctx.user);
    const next = String(body.newPassword || "");

    if (!passwordMatches(user, body.oldPassword)) {
        sendError(ctx.response, 401, "wrong");
        return;
    }

    if (next.length < 6 || next.length > 64) {
        sendError(ctx.response, 400, "weak");
        return;
    }

    user.salt = crypto.randomBytes(16).toString("hex");
    user.hash = hashPassword(next, user.salt);
    saveDatabase();
    sendJson(ctx.response, 200, { ok: true });
}, authLimit);

add("GET", "/api/users/([^/]+)", function (ctx) {
    const user = findUser(ctx.params[0]);

    if (!user) {
        sendError(ctx.response, 404, "notfound");
        return;
    }

    sendJson(ctx.response, 200, profileOf(user));
});

add("GET", "/api/users/([^/]+)/avatar", function (ctx) {
    const user = findUser(ctx.params[0]);

    if (!user || !user.avatarType) {
        sendError(ctx.response, 404, "notfound");
        return;
    }

    sendStoredImage(ctx.response, path.join(filesDirectory, "a-" + user.id), user.avatarType);
});

add("GET", "/api/top", function (ctx) {
    const list = database.users.map(profileOf).sort(function (first, second) {
        return second.points - first.points;
    }).slice(0, 20);

    sendJson(ctx.response, 200, list.map(function (item) {
        return { name: item.name, role: item.role, hasAvatar: item.hasAvatar, points: item.points, rank: item.rank };
    }));
});

add("GET", "/api/notifications", function (ctx) {
    sendJson(ctx.response, 200, findUser(ctx.user).notifications);
}, { auth: true });

add("POST", "/api/notifications/read", function (ctx) {
    findUser(ctx.user).notifications.forEach(function (item) {
        item.read = true;
    });

    saveDatabase();
    sendJson(ctx.response, 200, { ok: true });
}, { auth: true });

add("GET", "/api/news", function (ctx) {
    sendJson(ctx.response, 200, database.news.slice().reverse());
});

add("POST", "/api/news", async function (ctx) {
    const body = await readJson(ctx.request, 3000);
    const title = clean(body.title, 100);
    const text = clean(body.body, 600);
    const url = clean(body.url, 300);
    const game = body.game;

    if (!title || !text || !(game === "all" || validGames.includes(game))) {
        sendError(ctx.response, 400, "fill");
        return;
    }

    if (url && !/^https?:\/\//i.test(url)) {
        sendError(ctx.response, 400, "fill");
        return;
    }

    database.news.push({ id: newId(), game: game, title: title, body: text, url: url, author: ctx.user, createdAt: Date.now() });
    saveDatabase();
    sendJson(ctx.response, 200, { ok: true });
}, { auth: true, admin: true });

add("DELETE", "/api/news/([a-f0-9]+)", function (ctx) {
    database.news = database.news.filter(function (item) {
        return item.id !== ctx.params[0];
    });

    saveDatabase();
    sendJson(ctx.response, 200, { ok: true });
}, { auth: true, admin: true });

add("GET", "/api/poll", function (ctx) {
    sendJson(ctx.response, 200, publicPoll(ctx.user));
});

add("POST", "/api/poll", async function (ctx) {
    const body = await readJson(ctx.request, 3000);
    const question = clean(body.question, 120);

    const options = (Array.isArray(body.options) ? body.options : []).map(function (item) {
        return clean(item, 60);
    }).filter(Boolean).slice(0, 6);

    if (!question || options.length < 2) {
        sendError(ctx.response, 400, "fill");
        return;
    }

    database.poll = { question: question, options: options, votes: [], createdAt: Date.now() };
    saveDatabase();
    sendJson(ctx.response, 200, { ok: true });
}, { auth: true, admin: true });

add("POST", "/api/poll/vote", async function (ctx) {
    const body = await readJson(ctx.request, 500);
    const option = Number(body.option);
    const poll = database.poll;

    if (!poll || !Number.isInteger(option) || option < 0 || option >= poll.options.length) {
        sendError(ctx.response, 400, "fill");
        return;
    }

    const already = poll.votes.some(function (vote) {
        return vote.user === ctx.user;
    });

    if (!already) {
        poll.votes.push({ user: ctx.user, option: option });
        saveDatabase();
    }

    sendJson(ctx.response, 200, publicPoll(ctx.user));
}, { auth: true });

add("GET", "/api/chat", function (ctx) {
    const channel = ctx.url.searchParams.get("channel");
    const since = Number(ctx.url.searchParams.get("since") || 0);

    if (!chatChannels.includes(channel)) {
        sendError(ctx.response, 400, "fill");
        return;
    }

    const messages = database.chat.filter(function (message) {
        return message.channel === channel && message.seq > since;
    }).slice(-100);

    sendJson(ctx.response, 200, messages.map(function (message) {
        return Object.assign({}, message, { authorAvatar: hasAvatar(message.author) });
    }));
});

add("POST", "/api/chat", async function (ctx) {
    const body = await readJson(ctx.request, 1000);
    const text = clean(body.text, 200);

    if (!text || !chatChannels.includes(body.channel)) {
        sendError(ctx.response, 400, "fill");
        return;
    }

    database.chatSeq += 1;
    database.chat.push({ seq: database.chatSeq, channel: body.channel, author: ctx.user, text: text, createdAt: Date.now() });

    if (database.chat.length > 400) {
        database.chat.shift();
    }

    saveDatabase();
    sendJson(ctx.response, 200, { ok: true });
}, { auth: true, limit: "chat", max: 25, window: 30000 });

add("GET", "/api/threads", function (ctx) {
    sendJson(ctx.response, 200, database.threads.slice().reverse().map(function (thread) {
        return publicThread(thread, ctx.user);
    }));
});

add("POST", "/api/threads", async function (ctx) {
    const body = await readJson(ctx.request, 5000);
    const title = clean(body.title, 80);
    const text = clean(body.body, 500);

    if (!validGames.includes(body.game) || !title || !text) {
        sendError(ctx.response, 400, "fill");
        return;
    }

    database.threads.push({
        id: newId(),
        game: body.game,
        title: title,
        body: text,
        author: ctx.user,
        createdAt: Date.now(),
        pinned: false,
        likes: [],
        replies: []
    });

    if (database.threads.length > 5000) {
        database.threads.shift();
    }

    saveDatabase();
    sendJson(ctx.response, 200, { ok: true });
}, { auth: true });

add("DELETE", "/api/threads/([a-f0-9]+)", function (ctx) {
    const thread = findThread(ctx.params[0]);

    if (!thread) {
        sendError(ctx.response, 404, "notfound");
        return;
    }

    if (thread.author !== ctx.user && !isAdmin(ctx.user)) {
        sendError(ctx.response, 403, "forbidden");
        return;
    }

    database.threads = database.threads.filter(function (item) {
        return item !== thread;
    });

    saveDatabase();
    sendJson(ctx.response, 200, { ok: true });
}, { auth: true });

add("POST", "/api/threads/([a-f0-9]+)/like", function (ctx) {
    const thread = findThread(ctx.params[0]);

    if (!thread) {
        sendError(ctx.response, 404, "notfound");
        return;
    }

    toggleIn(thread.likes, ctx.user);
    saveDatabase();
    sendJson(ctx.response, 200, { ok: true });
}, { auth: true });

add("POST", "/api/threads/([a-f0-9]+)/pin", function (ctx) {
    const thread = findThread(ctx.params[0]);

    if (!thread) {
        sendError(ctx.response, 404, "notfound");
        return;
    }

    thread.pinned = !thread.pinned;
    saveDatabase();
    sendJson(ctx.response, 200, { ok: true });
}, { auth: true, admin: true });

add("POST", "/api/threads/([a-f0-9]+)/replies", async function (ctx) {
    const body = await readJson(ctx.request, 2000);
    const text = clean(body.text, 300);
    const thread = findThread(ctx.params[0]);

    if (!thread || !text) {
        sendError(ctx.response, 400, "fill");
        return;
    }

    thread.replies.push({ id: newId(), author: ctx.user, text: text, createdAt: Date.now(), likes: [] });

    if (thread.author !== ctx.user) {
        notify(thread.author, { type: "reply", from: ctx.user, text: thread.title, ref: thread.id });
    }

    saveDatabase();
    sendJson(ctx.response, 200, { ok: true });
}, { auth: true });

add("DELETE", "/api/threads/([a-f0-9]+)/replies/([a-f0-9]+)", function (ctx) {
    const thread = findThread(ctx.params[0]);
    const reply = thread ? thread.replies.find(function (item) {
        return item.id === ctx.params[1];
    }) : null;

    if (!reply) {
        sendError(ctx.response, 404, "notfound");
        return;
    }

    if (reply.author !== ctx.user && !isAdmin(ctx.user)) {
        sendError(ctx.response, 403, "forbidden");
        return;
    }

    thread.replies = thread.replies.filter(function (item) {
        return item !== reply;
    });

    saveDatabase();
    sendJson(ctx.response, 200, { ok: true });
}, { auth: true });

add("POST", "/api/threads/([a-f0-9]+)/replies/([a-f0-9]+)/like", function (ctx) {
    const thread = findThread(ctx.params[0]);
    const reply = thread ? thread.replies.find(function (item) {
        return item.id === ctx.params[1];
    }) : null;

    if (!reply) {
        sendError(ctx.response, 404, "notfound");
        return;
    }

    toggleIn(reply.likes, ctx.user);
    saveDatabase();
    sendJson(ctx.response, 200, { ok: true });
}, { auth: true });

add("GET", "/api/mods", function (ctx) {
    sendJson(ctx.response, 200, database.mods.slice().reverse().map(function (mod) {
        return publicMod(mod, ctx.user);
    }));
});

add("POST", "/api/mods", function (ctx) {
    receiveMod(ctx.request, ctx.response, ctx.user);
}, { auth: true, limit: "upload", max: 20, window: 600000 });

add("GET", "/api/mods/([a-f0-9]+)", function (ctx) {
    const mod = findMod(ctx.params[0]);

    if (!mod) {
        sendError(ctx.response, 404, "notfound");
        return;
    }

    sendJson(ctx.response, 200, {
        mod: publicMod(mod, ctx.user),
        comments: mod.comments.map(publicComment)
    });
});

add("DELETE", "/api/mods/([a-f0-9]+)", function (ctx) {
    const mod = findMod(ctx.params[0]);

    if (!mod) {
        sendError(ctx.response, 404, "notfound");
        return;
    }

    if (mod.author !== ctx.user && !isAdmin(ctx.user)) {
        sendError(ctx.response, 403, "forbidden");
        return;
    }

    database.mods = database.mods.filter(function (item) {
        return item !== mod;
    });

    fs.unlink(path.join(filesDirectory, mod.id), function () { });
    fs.unlink(path.join(filesDirectory, mod.id + ".img"), function () { });

    mod.gallery.forEach(function (item) {
        fs.unlink(path.join(filesDirectory, mod.id + "-" + item.id), function () { });
    });

    if (database.featuredMod === mod.id) {
        database.featuredMod = null;
    }

    saveDatabase();
    sendJson(ctx.response, 200, { ok: true });
}, { auth: true });

add("GET", "/api/mods/([a-f0-9]+)/file", function (ctx) {
    const mod = findMod(ctx.params[0]);

    if (!mod) {
        sendError(ctx.response, 404, "notfound");
        return;
    }

    const target = path.join(filesDirectory, mod.id);

    fs.stat(target, function (error, stats) {
        if (error) {
            sendError(ctx.response, 404, "notfound");
            return;
        }

        mod.downloads += 1;
        saveDatabase();

        ctx.response.writeHead(200, {
            "Content-Type": "application/octet-stream",
            "Content-Length": stats.size,
            "Content-Disposition": "attachment; filename*=UTF-8''" + encodeURIComponent(mod.fileName),
            "X-Content-Type-Options": "nosniff"
        });

        fs.createReadStream(target).pipe(ctx.response);
    });
});

add("GET", "/api/mods/([a-f0-9]+)/image", function (ctx) {
    const mod = findMod(ctx.params[0]);

    if (!mod || !mod.imageType) {
        sendError(ctx.response, 404, "notfound");
        return;
    }

    sendStoredImage(ctx.response, path.join(filesDirectory, mod.id + ".img"), mod.imageType);
});

add("POST", "/api/mods/([a-f0-9]+)/image", async function (ctx) {
    const mod = findMod(ctx.params[0]);

    if (!mod || mod.author !== ctx.user) {
        ctx.request.resume();
        sendError(ctx.response, 404, "notfound");
        return;
    }

    const buffer = await readBuffer(ctx.request, maxImageSize);
    const type = detectImageType(buffer);

    if (!type) {
        sendError(ctx.response, 400, "image");
        return;
    }

    fs.writeFileSync(path.join(filesDirectory, mod.id + ".img"), buffer);
    mod.imageType = type;
    saveDatabase();
    sendJson(ctx.response, 200, { ok: true });
}, { auth: true });

add("POST", "/api/mods/([a-f0-9]+)/rate", async function (ctx) {
    const body = await readJson(ctx.request, 300);
    const stars = Number(body.stars);
    const mod = findMod(ctx.params[0]);

    if (!mod || !Number.isInteger(stars) || stars < 1 || stars > 5) {
        sendError(ctx.response, 400, "fill");
        return;
    }

    const existing = mod.ratings.find(function (item) {
        return item.user === ctx.user;
    });

    if (existing) {
        existing.stars = stars;
    } else {
        mod.ratings.push({ user: ctx.user, stars: stars });
    }

    saveDatabase();
    sendJson(ctx.response, 200, { ok: true });
}, { auth: true });

add("POST", "/api/mods/([a-f0-9]+)/favorite", function (ctx) {
    const mod = findMod(ctx.params[0]);

    if (!mod) {
        sendError(ctx.response, 404, "notfound");
        return;
    }

    toggleIn(findUser(ctx.user).favorites, mod.id);
    saveDatabase();
    sendJson(ctx.response, 200, { ok: true });
}, { auth: true });

add("POST", "/api/mods/([a-f0-9]+)/comments", async function (ctx) {
    const body = await readJson(ctx.request, 1500);
    const text = clean(body.text, 400);
    const mod = findMod(ctx.params[0]);

    if (!mod || !text) {
        sendError(ctx.response, 400, "fill");
        return;
    }

    mod.comments.push({ id: newId(), author: ctx.user, text: text, createdAt: Date.now() });

    if (mod.author !== ctx.user) {
        notify(mod.author, { type: "comment", from: ctx.user, text: mod.name, ref: mod.id });
    }

    saveDatabase();
    sendJson(ctx.response, 200, { ok: true });
}, { auth: true });

add("DELETE", "/api/mods/([a-f0-9]+)/comments/([a-f0-9]+)", function (ctx) {
    const mod = findMod(ctx.params[0]);
    const comment = mod ? mod.comments.find(function (item) {
        return item.id === ctx.params[1];
    }) : null;

    if (!comment) {
        sendError(ctx.response, 404, "notfound");
        return;
    }

    if (comment.author !== ctx.user && !isAdmin(ctx.user)) {
        sendError(ctx.response, 403, "forbidden");
        return;
    }

    mod.comments = mod.comments.filter(function (item) {
        return item !== comment;
    });

    saveDatabase();
    sendJson(ctx.response, 200, { ok: true });
}, { auth: true });

function unreadMessagesOf(name) {
    return database.messages.filter(function (message) {
        return message.to === name && !message.read;
    }).length;
}

function conversationsOf(name) {
    const map = new Map();

    database.messages.forEach(function (message) {
        if (message.from !== name && message.to !== name) {
            return;
        }

        const other = message.from === name ? message.to : message.from;
        const entry = map.get(other) || { name: other, hasAvatar: hasAvatar(other), last: "", lastAt: 0, unread: 0 };

        if (message.createdAt >= entry.lastAt) {
            entry.last = message.text.slice(0, 80);
            entry.lastAt = message.createdAt;
        }

        if (message.to === name && !message.read) {
            entry.unread += 1;
        }

        map.set(other, entry);
    });

    return Array.from(map.values()).sort(function (first, second) {
        return second.lastAt - first.lastAt;
    });
}

add("GET", "/api/messages", function (ctx) {
    sendJson(ctx.response, 200, conversationsOf(ctx.user));
}, { auth: true });

add("GET", "/api/messages/([^/]+)", function (ctx) {
    const other = findUser(ctx.params[0]);

    if (!other) {
        sendError(ctx.response, 404, "notfound");
        return;
    }

    let changed = false;

    const thread = database.messages.filter(function (message) {
        return (message.from === ctx.user && message.to === other.name) || (message.from === other.name && message.to === ctx.user);
    });

    thread.forEach(function (message) {
        if (message.to === ctx.user && !message.read) {
            message.read = true;
            changed = true;
        }
    });

    if (changed) {
        saveDatabase();
    }

    sendJson(ctx.response, 200, thread.slice(-200).map(function (message) {
        return { id: message.id, from: message.from, text: message.text, createdAt: message.createdAt };
    }));
}, { auth: true });

add("POST", "/api/messages/([^/]+)", async function (ctx) {
    const body = await readJson(ctx.request, 1500);
    const text = clean(body.text, 500);
    const other = findUser(ctx.params[0]);

    if (!other || other.name === ctx.user) {
        sendError(ctx.response, 404, "notfound");
        return;
    }

    if (!text) {
        sendError(ctx.response, 400, "fill");
        return;
    }

    database.messages.push({ id: newId(), from: ctx.user, to: other.name, text: text, createdAt: Date.now(), read: false });

    if (database.messages.length > 20000) {
        database.messages.shift();
    }

    saveDatabase();
    sendJson(ctx.response, 200, { ok: true });
}, { auth: true, limit: "dm", max: 30, window: 60000 });

add("POST", "/api/mods/([a-f0-9]+)/gallery", async function (ctx) {
    const mod = findMod(ctx.params[0]);

    if (!mod || mod.author !== ctx.user || mod.gallery.length >= 4) {
        ctx.request.resume();
        sendError(ctx.response, 400, "fill");
        return;
    }

    const buffer = await readBuffer(ctx.request, maxImageSize);
    const type = detectImageType(buffer);

    if (!type) {
        sendError(ctx.response, 400, "image");
        return;
    }

    const id = newId();
    fs.writeFileSync(path.join(filesDirectory, mod.id + "-" + id), buffer);
    mod.gallery.push({ id: id, type: type });
    saveDatabase();
    sendJson(ctx.response, 200, { id: id });
}, { auth: true });

add("GET", "/api/mods/([a-f0-9]+)/gallery/([a-f0-9]+)", function (ctx) {
    const mod = findMod(ctx.params[0]);
    const item = mod ? mod.gallery.find(function (entry) {
        return entry.id === ctx.params[1];
    }) : null;

    if (!item) {
        sendError(ctx.response, 404, "notfound");
        return;
    }

    sendStoredImage(ctx.response, path.join(filesDirectory, mod.id + "-" + item.id), item.type);
});

add("DELETE", "/api/mods/([a-f0-9]+)/gallery/([a-f0-9]+)", function (ctx) {
    const mod = findMod(ctx.params[0]);
    const item = mod ? mod.gallery.find(function (entry) {
        return entry.id === ctx.params[1];
    }) : null;

    if (!item) {
        sendError(ctx.response, 404, "notfound");
        return;
    }

    if (mod.author !== ctx.user && !isAdmin(ctx.user)) {
        sendError(ctx.response, 403, "forbidden");
        return;
    }

    mod.gallery = mod.gallery.filter(function (entry) {
        return entry !== item;
    });

    fs.unlink(path.join(filesDirectory, mod.id + "-" + item.id), function () { });
    saveDatabase();
    sendJson(ctx.response, 200, { ok: true });
}, { auth: true });

add("POST", "/api/mods/([a-f0-9]+)/feature", function (ctx) {
    const mod = findMod(ctx.params[0]);

    if (!mod) {
        sendError(ctx.response, 404, "notfound");
        return;
    }

    database.featuredMod = database.featuredMod === mod.id ? null : mod.id;
    saveDatabase();
    sendJson(ctx.response, 200, { ok: true });
}, { auth: true, admin: true });

add("POST", "/api/users/([^/]+)/ban", function (ctx) {
    const target = findUser(ctx.params[0]);

    if (!target || target.role === "admin") {
        sendError(ctx.response, 400, "forbidden");
        return;
    }

    target.banned = !target.banned;

    if (target.banned) {
        Object.keys(database.sessions).forEach(function (token) {
            if (database.sessions[token] === target.name) {
                delete database.sessions[token];
            }
        });
    }

    saveDatabase();
    sendJson(ctx.response, 200, { banned: target.banned });
}, { auth: true, admin: true });

async function route(request, response) {
    const url = new URL(request.url, "http://localhost");
    const pathname = url.pathname;
    const method = request.method;

    if (method === "GET" && Object.prototype.hasOwnProperty.call(staticFiles, pathname)) {
        serveStatic(request, response, staticFiles[pathname]);
        return;
    }

    if (!pathname.startsWith("/api/")) {
        sendError(response, 404, "notfound");
        return;
    }

    const user = getSessionUser(request);

    for (const entry of routes) {
        if (entry.method !== method) {
            continue;
        }

        const match = pathname.match(entry.regex);

        if (!match) {
            continue;
        }

        const options = entry.options;

        if (method !== "GET" && limited(request, options.limit || "write", options.max || 120, options.window || 60000)) {
            request.resume();
            sendError(response, 429, "rate");
            return;
        }

        if (options.auth && !user) {
            request.resume();
            sendError(response, 401, "login");
            return;
        }

        if (options.auth && method !== "GET" && findUser(user).banned) {
            request.resume();
            sendError(response, 403, "banned");
            return;
        }

        if (options.admin && !isAdmin(user)) {
            request.resume();
            sendError(response, 403, "forbidden");
            return;
        }

        await entry.handler({
            request: request,
            response: response,
            user: user,
            url: url,
            params: match.slice(1).map(safeDecode)
        });

        return;
    }

    request.resume();
    sendError(response, 404, "notfound");
}

const server = http.createServer(async function (request, response) {
    try {
        await route(request, response);
    } catch (error) {
        if (response.headersSent) {
            return;
        }

        const known = ["size", "fill", "image"];

        if (known.includes(error.message)) {
            sendError(response, 400, error.message);
        } else {
            console.error(error);
            sendError(response, 500, "server");
        }
    }
});

function backupDatabase() {
    try {
        if (!fs.existsSync(databaseFile)) {
            return;
        }

        const directory = path.join(dataDirectory, "backups");
        fs.mkdirSync(directory, { recursive: true });

        const stamp = new Date().toISOString().slice(0, 13).replace(/[-T:]/g, "");
        fs.copyFileSync(databaseFile, path.join(directory, "db-" + stamp + ".json"));

        const files = fs.readdirSync(directory).sort();

        while (files.length > 14) {
            fs.unlinkSync(path.join(directory, files.shift()));
        }
    } catch (error) {
        console.error(error);
    }
}

function openBrowser(address) {
    let command = 'xdg-open "' + address + '"';

    if (process.platform === "win32") {
        command = 'start "" "' + address + '"';
    } else if (process.platform === "darwin") {
        command = 'open "' + address + '"';
    }

    childProcess.exec(command, function () { });
}

function startServer(attemptPort, triesLeft) {
    server.removeAllListeners("error");
    server.removeAllListeners("listening");

    server.once("error", function (error) {
        if (error.code === "EADDRINUSE" && triesLeft > 0) {
            console.log("Port " + attemptPort + " is busy, trying " + (attemptPort + 1) + "...");
            startServer(attemptPort + 1, triesLeft - 1);
            return;
        }

        console.error(error);
        process.exit(1);
    });

    server.once("listening", function () {
        server.removeAllListeners("error");

        const address = "http://localhost:" + attemptPort;

        console.log("");
        console.log("  Frag Hall is running: " + address);
        console.log("  Keep this window open while you use the site.");
        console.log("  Press Ctrl+C to stop.");
        console.log("");

        if (!process.env.NO_OPEN && !process.env.PORT) {
            openBrowser(address);
        }
    });

    server.listen(attemptPort);
}

backupDatabase();
setInterval(backupDatabase, 6 * 60 * 60 * 1000).unref();
startServer(Number(port), 10);
